# Hyper Geospace

## Project Aims

This is an EXPERIMENTAL library to provide a simple interface to write and query geospatial data in geojson format to 
and from the hypercore data mesh, in a way that provides for sparse reading.

The aims of this project are to provide a simple, usable api to read and write geospatial information to the peer-to-peer
data mesh, in a way that is at least relatively efficient, but not necessarily performant.

That means, critically, that a client, reading from hyper-geospace should not have to copy all of the information.

However, it also doesn't mean that it will only need to copy the optimal amount of information. The project aims to use 
h3 indexing to get an approximate range of geojson features, and then "fine-tune" the queries locally using geospatial
operations.

### Roadmap

[] - write points to hyperbee
[] - write lines, polygons to hyperbee
[] - find points by distance from a point
[] - sort points by distance from a point
[] - find points by intersection with a polygon
[] - find lines and polygons by distance from a point
[] - find lines and polygons by intersection with a polygon
... suggest other ideas using github issues.

## How To Use




### Dependencies

This project relies heavily on the following projects, which could use your support:

- Hyperbee: A Btree implementation on the hypercore-protocol append-only log.
- Turfjs: This is a modular set of geojson utilities that is central to doing GIS calculations in js. If you might use
  this package, you are probably already relying on turf, and it might be solid to throw some support their way.
- H3: An Uber library (written in C) that is used to create the indexes for writing coordinates to hyperbee.