const program = require("commander");
const fs = require("fs");
const glob = require("glob");

const convert = require("./convert.js");
const detectJsx = require("./detect-jsx.js");
const detectEmptyFlowFile = require("./detect-flow.js");
const version = require("../package.json").version;

const cli = argv => {
  program
    .version(version)
    .option(
      "--inline-utility-types",
      "inline utility types when possible, defaults to 'false'"
    )
    .option("--prettier", "use prettier for formatting")
    .option(
      "--semi",
      "add semi-colons, defaults to 'false' (depends on --prettier)"
    )
    .option(
      "--single-quote",
      "use single quotes instead of double quotes, defaults to 'false' (depends on --prettier)"
    )
    .option(
      "--tab-width [width]",
      "size of tabs (depends on --prettier)",
      /2|4/,
      4
    )
    .option(
      "--trailing-comma [all|es5|none]",
      "where to put trailing commas (depends on --prettier)",
      /all|es5|none/,
      "all"
    )
    .option(
      "--bracket-spacing",
      "put spaces between braces and contents, defaults to 'false' (depends on --prettier)"
    )
    .option(
      "--arrow-parens [avoid|always]",
      "arrow function param list parens (depends on --prettier)",
      /avoid|always/,
      "avoid"
    )
    .option("--print-width [width]", "line width (depends on --prettier)", 80)
    .option("--write", "write output to disk instead of STDOUT")
    .option("--delete-source", "delete the source file")
    .option("--stats", "show stats");

  program.parse(argv);

  if (program.args.length === 0) {
    program.outputHelp();
    process.exit(1);
  }

  const options = {
    inlineUtilityTypes: Boolean(program.inlineUtilityTypes),
    prettier: program.prettier,
    semi: Boolean(program.semi),
    singleQuote: Boolean(program.singleQuote),
    tabWidth: parseInt(program.tabWidth),
    trailingComma: program.trailingComma,
    bracketSpacing: Boolean(program.bracketSpacing),
    arrowParens: program.arrowParens,
    printWidth: parseInt(program.printWidth),
    stats: Boolean(program.stats)
  };

  const files = new Set();
  for (const arg of program.args) {
    for (const file of glob.sync(arg)) {
      files.add(file);
    }
  }

  const stats = {
    emptyFlowFiles: {
      title: "Empty @flow files",
      description:
        "Number of @flow files containing @flow comment but no type information",
      value: 0,
      files: []
    }
  };

  for (const file of files) {
    const inFile = file;
    const inCode = fs.readFileSync(inFile, "utf-8");
    // Stats
    const isEmptyFlowFile = detectEmptyFlowFile(inCode);

    if (isEmptyFlowFile) {
      stats.emptyFlowFiles.value += 1;
      stats.emptyFlowFiles.files.push(inFile);
    }

    if (program.stats) continue;

    try {
      const outCode = convert(inCode, options);

      if (program.write) {
        const extension = detectJsx(inCode) ? ".tsx" : ".ts";
        const outFile = file.replace(/\.jsx?$/, extension);
        fs.writeFileSync(outFile, outCode);
      } else {
        console.log(outCode);
      }

      if (program.deleteSource) {
        fs.unlinkSync(inFile);
      }
    } catch (e) {
      console.error(`error processing ${inFile}`);
      console.error(e);
    }
  }

  if (program.stats) {
    console.log(JSON.stringify(stats, null, 4));
  }
};

module.exports = cli;
