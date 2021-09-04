import Hyperbee from "hyperbee";
import { Point, Feature, FeatureCollection } from "geojson";
import * as s2 from "nodes2ts";
import { v4 } from "uuid";

interface CreateOptions {
  resolution?: number;
  // TODO: establish typings for batch
  batch?: any;
}

export class HyperGeospace {
  // IDEA: should we extend Hyperbee or make a ref to hyperbee?
  readonly db: Hyperbee;
  readonly minimumResolution: number;
  private generateId: (feature) => string;

  constructor(
    feed,
    {
      minimumResolution = 12,
      // IDEA: besides minumum resolution, need to be able to tweak indexing
      //       ideally to preference either space or rts, depending on
      //       density of features
      generateId = () => v4(),
    } = {}
  ) {
    this.minimumResolution = minimumResolution;
    this.db = new Hyperbee(feed, {
      keyEncoding: "utf-8",
      valueEncoding: "json",
    });
    this.generateId = generateId;
  }

  getDocumentKey(hashIndex, id) {
    return `hg:${hashIndex}/${id}`;
  }

  // create methods

  async create(feature: Feature | FeatureCollection, opts: CreateOptions = {}) {
    if (feature.type === "Feature") {
      switch (feature.geometry.type) {
        case "Point":
          return this.createPointFeature(feature as Feature<Point>, opts);

        default:
          throw new Error(
            "This feature is of a type that is not yet implemented"
          );
      }
    } else if (feature.type === "FeatureCollection") {
      return this.bulkCreateFeatures(feature);
    }
  }

  async createPointFeature(
    point: Feature<Point>,
    opts: CreateOptions = {}
  ): Promise<[string, Feature<Point>]> {
    const { resolution = this.minimumResolution, batch } = opts;
    const [longitude, latitude, depth] = point.geometry.coordinates;
    if (!point.id) {
      point.id = this.generateId(point);
    }
    const s2point = new s2.S2Point(latitude, longitude, depth);
    const index = s2.S2CellId.fromPoint(s2point).toToken();
    const key = this.getDocumentKey(index, point.id);
    if (batch) {
      await batch.put(key, point);
    } else {
      await this.db.put(key, point);
    }
    return [key, point];
  }

  async bulkCreateFeatures(
    listOfFeatures: Feature[] | FeatureCollection,
    opts: CreateOptions = {}
  ) {
    if (!Array.isArray(listOfFeatures)) {
      // IDEA: how should we handle properties of the featureCollection?
      listOfFeatures = listOfFeatures.features;
    }
    let batchPassedIn = true;
    if (!opts.batch) {
      batchPassedIn = false;
      // explicitly create the batch.
      opts.batch = this.db.batch();
    }

    const results = [];
    try {
      for (const feature of listOfFeatures) {
        // IDEA: should this be parallelized? I imagine this is one linear write operation
        // if it's not more performant, may be best to align seq explicitly to index in src.
        const iterationResults = await this.create(feature, opts);
        results.push(iterationResults);
      }
      if (!batchPassedIn) {
        await opts.batch.flush();
      }
    } catch (err) {
      opts.batch.destroy();
      throw err;
    }
    return results;
  }

  async find() {}

  async findByPointAndRadius({
    latitude,
    longitude,
    radiusInKm,
  }): Promise<Array<any>> {
    const region = s2.Utils.calcRegionFromCenterRadius(
      new s2.S2LatLng(latitude, longitude),
      radiusInKm
    );

    const regionCells = new s2.S2RegionCoverer().getCoveringCells(region);

    // TODO: this is 0% efficient
    const sortedCells = regionCells
      .map((v) => v.toToken())
      .sort((a, b) => a.localeCompare(b));

    const TESTSTREAM = this.db.createReadStream({
      limit: 50,
    });

    const stream = this.db.createReadStream({
      gte: `hg:${sortedCells[0]}`,
      lte: `hg:${sortedCells[sortedCells.length - 1]}Ω`,
      limit: 50,
    });

    return new Promise((resolve, reject) => {
      let data = [];
      stream.on("data", (doc) => {
        console.log(doc);
        // TODO: refine the result-set
        data.push(doc);
      });
      stream.on("end", (...args) => {
        console.log("streamEnd", args);
        resolve(data);
      });
      stream.on("error", (e) => {
        console.error(e);
        reject(e);
      });
    });
  }
}
