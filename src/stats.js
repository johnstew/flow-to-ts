const { parse } = require("@babel/parser");
const t = require("@babel/types");
const { table } = require("table");
const fs = require("fs");

const traverse = require("../babel-traverse/lib/index.js").default;
const { isEmptyFlowFile, hasFlowComment } = require("./empty-flow");
const { parseOptions } = require("./convert.js");

const statFlowFile = ast => hasFlowComment(ast);

const printStats = stats => {
  const config = {
    columns: {
      3: {
        width: 20,
        truncate: 100
      }
    }
  };
  const tableStats = Object.values(stats).map(stat => {
    if (stat.condition) {
      delete stat.condition;
    }
    return Object.values(stat);
  });
  tableStats.unshift(["Title", "Description", "Value", "Files"]);
  return table(tableStats, config);
};

const printBuckets = buckets => {
  const tableBuckets = [["#", "Location", "# of @flow files"]];
  let totalValue = 0;
  let index = 1;
  for (const [bucket, value] of buckets) {
    if (value > 0) {
      tableBuckets.push([index, bucket, value]);
      totalValue += value;
      index += 1;
    }
  }

  tableBuckets.push(["##", "Total", totalValue]);

  return table(tableBuckets);
};

const getBucket = file => {
  const bucket = file
    .split("/")
    .slice(0, 3)
    .join("/");
  return bucket;
};

const getBuckets = files => {
  const buckets = new Map();

  for (const file of files) {
    const bucket = getBucket(file);

    if (!buckets.has(bucket)) {
      buckets.set(bucket, 0);
    }
  }

  return buckets;
};

const getStats = files => {
  const stats = {
    emptyFlowFiles: {
      title: "Empty @flow files",
      description:
        "Number of Flow files containing @flow comment but no type information",
      value: 0,
      files: []
    },
    flowFiles: {
      title: "@flow files",
      description: "Number of Flow files",
      value: 0,
      files: [],
      condition: statFlowFile
    },
    parseError: {
      title: "Parse Errors",
      description: "Number of errors reported when trying to parse a file",
      value: 0,
      files: []
    }
  };

  const buckets = getBuckets(files);

  for (const file of files) {
    const inCode = fs.readFileSync(file, "utf-8");
    const isEmptyFlow = isEmptyFlowFile(inCode);

    if (isEmptyFlow) {
      stats.emptyFlowFiles.value += 1;
      stats.emptyFlowFiles.files.push(file);
      continue;
    }

    let ast = null;
    try {
      ast = parse(inCode, parseOptions);
    } catch (error) {
      stats.parseError.value += 1;
      stats.parseError.files.push(file);
    }

    if (ast) {
      const bucket = getBucket(file);
      const isFlowFile = statFlowFile(ast);
      const value = buckets.get(bucket);
      const nextValue = isFlowFile ? value + 1 : value;
      buckets.set(bucket, nextValue);

      try {
        Object.keys(stats).forEach(statKey => {
          const stat = stats[statKey];
          if (stat.condition && stat.condition(ast)) {
            stat.value += 1;
            stat.files.push(file);
          }
        });
      } catch (error) {
        console.error(error);
      }
    }
  }

  return {
    stdout: {
      stats: printStats(stats),
      buckets: printBuckets(buckets)
    },
    stats
  };
};

module.exports = getStats;
