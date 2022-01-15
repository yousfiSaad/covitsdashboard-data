import moment from "moment";
import {
  evolve,
  flatten,
  groupBy,
  last,
  map,
  nth,
  pipe,
  prop,
  propOr,
  reject,
  scan,
  sortBy,
  toPairs,
  values,
} from "ramda";

export type DatumType = {
  date: Date;
  cases: number;
  newCases: number;
};

// export const isInRange = (selectedTimeRange: TimeRange) => (datum: any) => {
//   return selectedTimeRange
//     ? datum.date >= selectedTimeRange.start &&
//         datum.date <= selectedTimeRange.end
//     : true;
// };
// export const filterDataByCountries = (
//   selectedTimeRange: TimeRange,
//   selectedCountries: string[],
//   data: any,
//   data2: any
// ) =>
//   selectedCountries.map((country) => {
//     const countryData: DatumType = refineAndCleanData(country)(data)
//       .splice(1)
//       .filter(isInRange(selectedTimeRange));
//     const countryData2: DatumType = refineAndCleanData(country)(data2)
//       .splice(1)
//       .filter(isInRange(selectedTimeRange));

//     return {
//       country,
//       data: countryData,
//       data2: countryData2,
//     };
//   });

// export const aggregate = pipe<any, any, any, any, any, any>(
//   flatten,
//   groupBy(propOr(null, "date")),
//   toPairs,
//   map(([key, datums]) =>
//     datums.reduce(
//       (a: any, b: any) => ({
//         ...b,
//         cases: a.cases + b.cases,
//         newCases: a.newCases + b.newCases,
//       }),
//       { cases: 0, newCases: 0 }
//     )
//   ),
//   sortBy(prop("date"))
// );

// export const cleanAndAddNewCases = pipe<any, any, any, any, any, any>(
//   toPairs,
//   reject(([key, val]: string[]) =>
//     ["Province/State", "Country/Region", "Lat", "Long"].includes(key)
//   ),
//   map(([key, val]: string[]) => ({
//     date: new Date(key),
//     dateAsStr: key,
//     cases: parseInt(val),
//   })),
//   scan(
//     (acc: any, curr: any) => ({
//       ...curr,
//       newCases: curr.cases - acc.cases,
//     }),
//     { cases: 0 }
//   ),
//   reject(({ newCases }) => newCases < 0)
// );

// export const refineAndCleanData = (country: string) =>
//   pipe<any, any, any, any>(
//     filter(propEq("Country/Region", country)),
//     map(cleanAndAddNewCases),
//     aggregate
//   );

// export const refineData = pipe<any, any, any>(
//   map(cleanAndAddNewCases),
//   aggregate
// );

export const cleanAndAddNewCases2 = pipe<any, any, any, any, any, any, any>(
  nth(0),
  toPairs,
  reject(([key, val]: string[]) =>
    ["Province/State", "Country/Region", "Lat", "Long"].includes(key)
  ),
  map(([key, val]: string[]) => ({
    date: new Date(key),
    dateAsStr: key,
    cases: parseInt(val),
  })),
  scan(
    (acc: any, curr: any) => ({
      ...curr,
      newCases: curr.cases - acc.cases,
    }),
    { cases: 0 }
  ),
  reject(({ newCases }) => isNaN(newCases) || newCases < 0)
);

export const groupByCountry = pipe<any, any, any, any, any>(
  groupBy(propOr("", "Country/Region")),
  map(groupBy(propOr("", "Province/State"))),
  map(map(cleanAndAddNewCases2)),
  map(propOr([], ""))
);

export const groupVaccinationDataByCountryAndParseDate =
  pipe<any, any, any>(
    groupBy(propOr("", "country")),
    map(
      pipe(
        nth(0),
        propOr([], "data"),
        map((d: any) => ({
          ...d,
          dateAsStr: d.date,
          date: parseYYYYMMDD(d.date),
        }))
      )
    )
  );

export const parseYYYYMMDD = (str: string) => {
  const [year, month, day] = str.split("-");
  return new Date(
    parseInt(year) || 0,
    (parseInt(month) || 0) - 1,
    parseInt(day) || 0
  );
};

export const aggregate = pipe<any, any, any, any, any, any, any>(
  flatten,
  groupBy(propOr(null, "date")),
  toPairs,
  map(([, datums]) =>
    datums.reduce(
      (a: any, b: any) => ({
        ...b,
        cases: a.cases + b.cases,
        newCases: a.newCases + b.newCases,
      }),
      { cases: 0, newCases: 0 }
    )
  ),
  map(evolve({ date: parseYYYYMMDD })),
  sortBy(prop("date"))
);

const avgByGetter =
  (getter: (datum: DatumType) => number) => (data: DatumType[]) =>
    data.reduce((acc: number, cur: DatumType) => acc + getter(cur), 0) /
    data.length;

// TODO: create another lite worker without momentjs
export const avgByWeek = (
  data: DatumType[],
  propName: "cases" | "newCases" = "newCases"
) => {
  const getter = prop(propName);
  const groupedByWeek = groupBy((d) => {
    const dateWrapped = moment(d.date);
    const str = dateWrapped.format("YYYY-ww");
    return str;
  }, data) as any;
  const avFunc = avgByGetter(getter);
  const averaged = map(avFunc, groupedByWeek) as any;
  const weekData = pipe(
    toPairs,
    map(([weekAsStr, weekDatum]) => {
      return {
        date: moment(weekAsStr + "-3", "YYYY-ww-d").toDate(),
        [propName]: weekDatum,
      };
    }),
    sortBy(prop("date"))
  )(averaged);

  const lastDatum = last(weekData);
  if (lastDatum && lastDatum.date > new Date(2018, 10, 1)) {
    lastDatum.date = new Date();
  }

  // TODO: bad fix
  return weekData.slice(1);
};

export const aggregateAndAvg = (data: any[]) => {
  const agg = aggregate(data);
  const avg: any = avgByWeek(agg);

  return {
    agg,
    avg
  };
};

export const aggregateWorldData = pipe<any, any, any, any, any>(
  values,
  map(values),
  flatten,
  avgByWeek
);
