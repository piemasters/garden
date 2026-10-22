import { describe, expect, it } from "vite-plus/test";
import { councilsFromDownloadPage, exteriorRingsNear, matchCouncil, plotsAround } from "./parcels";

const COUNCILS = [
  { name: "City of Westminster", path: "/City_of_Westminster.zip" },
  { name: "City of London Corporation", path: "/City_of_London_Corporation.zip" },
  { name: "London Borough of Lambeth", path: "/London_Borough_of_Lambeth.zip" },
  { name: "Bristol City Council", path: "/Bristol_City_Council.zip" },
  { name: "Newcastle City Council", path: "/Newcastle_City_Council.zip" },
  { name: "Newcastle-under-Lyme Borough Council", path: "/Newcastle-under-Lyme.zip" },
  { name: "Royal Borough of Kensington and Chelsea", path: "/Kensington.zip" },
];

describe("Land Registry council files", () => {
  it("reads the council name and download path", () => {
    const html = `<th scope="row">City of Westminster</th><td><a href="/datasets/inspire/download/City_of_Westminster.zip">Download .gml</a></td>`;
    expect(councilsFromDownloadPage(html)).toEqual([
      { name: "City of Westminster", path: "/datasets/inspire/download/City_of_Westminster.zip" },
    ]);
  });

  it("matches a postcode district to the council file", () => {
    expect(matchCouncil("Westminster", COUNCILS)?.name).toBe("City of Westminster");
    expect(matchCouncil("City of London", COUNCILS)?.name).toBe("City of London Corporation");
    expect(matchCouncil("Lambeth", COUNCILS)?.name).toBe("London Borough of Lambeth");
    expect(matchCouncil("Bristol", COUNCILS)?.name).toBe("Bristol City Council");
    expect(matchCouncil("Kensington and Chelsea", COUNCILS)?.name).toBe(
      "Royal Borough of Kensington and Chelsea",
    );
    expect(matchCouncil("Newcastle upon Tyne", COUNCILS)?.name).toBe("Newcastle City Council");
  });
});

describe("Land Registry polygons", () => {
  it("keeps the exterior ring whose box contains the point", () => {
    const gml = `
      <gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>0 0 10 0 10 10 0 10 0 0</gml:posList></gml:LinearRing></gml:exterior>
      <gml:interior><gml:LinearRing><gml:posList>1 1 2 1 2 2 1 2 1 1</gml:posList></gml:LinearRing></gml:interior></gml:Polygon>
      <gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>100 100 110 100 110 110 100 110 100 100</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon>
    `;
    expect(exteriorRingsNear(gml, 5, 5)).toEqual([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
  });

  it("finds a garden-sized plot within the search distance", () => {
    const gml = `<gml:exterior><gml:LinearRing><gml:posList>0 0 30 0 30 20 0 20 0 0</gml:posList></gml:LinearRing></gml:exterior>`;
    expect(plotsAround(gml, 40, 10, 15)).toHaveLength(1);
    expect(plotsAround(gml, 40, 10, 5)).toHaveLength(0);
  });
});
