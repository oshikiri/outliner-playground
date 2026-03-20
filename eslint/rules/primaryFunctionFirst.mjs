import path from "node:path";

const MESSAGE_ID = "primaryFunctionFirst";

export default {
  meta: {
    docs: {
      description:
        "enforce placing the primary top-level function before helper implementations",
    },
    messages: {
      [MESSAGE_ID]:
        "Define primary top-level function {{name}} before helper implementations.",
    },
    schema: [],
    type: "suggestion",
  },
  create(context) {
    return {
      Program(program) {
        const functions = collectTopLevelFunctions(program);

        if (functions.length < 2) {
          return;
        }

        const primaryFunctionName = findPrimaryFunctionName(
          program,
          functions,
          context.filename,
        );

        if (primaryFunctionName == null) {
          return;
        }

        if (functions[0]?.name === primaryFunctionName) {
          return;
        }

        const primaryFunction = functions.find(
          (item) => item.name === primaryFunctionName,
        );

        if (primaryFunction == null) {
          return;
        }

        context.report({
          data: { name: primaryFunctionName },
          messageId: MESSAGE_ID,
          node: primaryFunction.reportNode,
        });
      },
    };
  },
};

function collectTopLevelFunctions(program) {
  const functions = [];

  for (const [index, statement] of program.body.entries()) {
    const declaration = unwrapTopLevelStatement(statement);

    if (declaration?.type === "FunctionDeclaration" && declaration.id != null) {
      functions.push({
        index,
        name: declaration.id.name,
        reportNode: declaration.id,
      });
      continue;
    }

    if (declaration?.type !== "VariableDeclaration") {
      continue;
    }

    for (const declarator of declaration.declarations) {
      if (
        declarator.id.type !== "Identifier" ||
        !isFunctionExpression(declarator.init)
      ) {
        continue;
      }

      functions.push({
        index,
        name: declarator.id.name,
        reportNode: declarator.id,
      });
    }
  }

  return functions;
}

function findPrimaryFunctionName(program, functions, filename) {
  const names = new Set(functions.map((item) => item.name));

  return (
    findDefaultExportedFunctionName(program, names) ??
    findSoleExportedFunctionName(program, names) ??
    findFileNamedFunctionName(filename, names)
  );
}

function findDefaultExportedFunctionName(program, names) {
  for (const statement of program.body) {
    if (statement.type !== "ExportDefaultDeclaration") {
      continue;
    }

    const declaration = statement.declaration;

    if (declaration.type === "FunctionDeclaration" && declaration.id != null) {
      return declaration.id.name;
    }

    if (declaration.type === "Identifier" && names.has(declaration.name)) {
      return declaration.name;
    }
  }

  return null;
}

function findSoleExportedFunctionName(program, names) {
  const exportedNames = [];

  for (const statement of program.body) {
    if (statement.type !== "ExportNamedDeclaration") {
      continue;
    }

    const declaration = statement.declaration;

    if (declaration?.type === "FunctionDeclaration" && declaration.id != null) {
      exportedNames.push(declaration.id.name);
      continue;
    }

    if (declaration?.type !== "VariableDeclaration") {
      continue;
    }

    for (const declarator of declaration.declarations) {
      if (
        declarator.id.type === "Identifier" &&
        isFunctionExpression(declarator.init)
      ) {
        exportedNames.push(declarator.id.name);
      }
    }
  }

  if (exportedNames.length !== 1) {
    return null;
  }

  return names.has(exportedNames[0]) ? exportedNames[0] : null;
}

function findFileNamedFunctionName(filename, names) {
  if (typeof filename !== "string" || filename.length === 0) {
    return null;
  }

  const baseName = path.basename(filename, path.extname(filename));
  return names.has(baseName) ? baseName : null;
}

function unwrapTopLevelStatement(statement) {
  if (
    statement.type === "ExportDefaultDeclaration" ||
    statement.type === "ExportNamedDeclaration"
  ) {
    return statement.declaration ?? null;
  }

  return statement;
}

function isFunctionExpression(node) {
  return (
    node?.type === "ArrowFunctionExpression" ||
    node?.type === "FunctionExpression"
  );
}
