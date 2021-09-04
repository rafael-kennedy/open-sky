import { createCore, getEarthquakes } from "../__testing/utils";
import Hyperbee from "hyperbee";
import { HyperGeospace } from "./index";
import { Point, Feature, FeatureCollection } from "geojson";
import distance from "@turf/distance";

const state: { hyperbee: Hyperbee; hypergeo: HyperGeospace; core: any } = {
  core: null,
  hyperbee: null,
  hypergeo: null,
};

describe("Hypergeo behaviors", () => {
  beforeEach(async () => {
    state.core = createCore();
  });

  test("generates ids for points without ids", async () => {
    const hypergeo = new HyperGeospace(state.core);
    const quakePoint = getEarthquakes().features[0] as Feature<Point>;
    delete quakePoint.id;

    const [key, point] = await hypergeo.create(quakePoint);
    expect(point.id).toBeTruthy();
  });

  test("allows passing custom id function", async () => {
    const hypergeo = new HyperGeospace(state.core, {
      generateId() {
        return "custom-id";
      },
    });
    const quakePoint = getEarthquakes().features[0] as Feature<Point>;
    delete quakePoint.id;
    const [key, point] = await hypergeo.create(quakePoint);
    expect(point.id).toBe("custom-id");
  });

  test("warns about unimplemented types", async () => {
    const hypergeo = new HyperGeospace(state.core);
    const err = await hypergeo
      .create({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [-104.9, 15.5],
            [-105.6, 16.5],
            [-106.2, 18.3],
            [-107, 20.3],
            [-107.8, 21.9],
            [-108.6, 22.900000000000002],
            [-109.4, 23.9],
            [-110.9, 25.9],
            [-111.80000000000001, 28.4],
          ],
        },
        properties: {
          STORMNAME: "Nora",
          STORMTYPE: "TS",
          ADVDATE: "400 PM CDT Fri Aug 27 2021",
          ADVISNUM: "9",
          STORMNUM: "14.0",
          FCSTPRD: "120",
          BASIN: "EP",
        },
      })
      .catch((err) => err);
    expect(err.message).toBe(
      "This feature is of a type that is not yet implemented"
    );
  });
});

describe("points", () => {
  beforeEach(async () => {
    state.core = createCore();
    state.hypergeo = new HyperGeospace(state.core);
  });

  test("can be written and looked up by key", async () => {
    const quakePoint = getEarthquakes().features[0] as Feature<Point>;
    const [key, point] = await state.hypergeo.create(quakePoint);
    const { value } = await state.hypergeo.db.get(key);
    expect(value).toEqual(point);
    expect(point).toEqual(quakePoint);
  });

  test("can be bulk written as array", async () => {
    const quakePoints = getEarthquakes().features.slice(
      0,
      8
    ) as Feature<Point>[];
    const [[key]] = await state.hypergeo.bulkCreateFeatures(quakePoints);
    const { value } = await state.hypergeo.db.get(key);
    expect(value).toEqual(quakePoints[0]);
  });

  test("can be bulk written as feature collection", async () => {
    const quakePointCollection = getEarthquakes() as FeatureCollection<Point>;
    const [[key]] = await state.hypergeo.create(quakePointCollection);
    const { value } = await state.hypergeo.db.get(key);
    expect(value).toEqual(quakePointCollection.features[0]);
  });

  describe("query operations", () => {
    test("allow point and radius search", async () => {
      await state.hypergeo.create(getEarthquakes() as FeatureCollection<Point>);

      const pointInHawaii = {
        latitude: 19.3963333333333,
        longitude: -155.279333333333,
      };
      const queryResults = await state.hypergeo.findByPointAndRadius({
        ...pointInHawaii,
        radiusInKm: 1000,
      });

      expect(queryResults.length).toBe(4);
    });
  });
});
