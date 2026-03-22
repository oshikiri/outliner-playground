import path from "node:path";

const MESSAGE_ID = "primaryFunctionFirst";

type TopLevelFunction = {
  index: number;
  name: string;
  reportNode: unknown;
};

type ProgramStatement = {
  declaration?: ProgramStatement | null;
  declarations?: Array<{
    id: { name?: string; type: string };
    init?: { type?: string } | null;
  }>;
  id?: { name: string } | null;
  type: string;
  body?: ProgramStatement[];
};

type RuleContext = {
  filename: string;
  report: (descriptor: {
    data: { name: string };
    messageId: string;
    node: unknown;
  }) => void;
};

const rule = {
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
  create(context: RuleContext) {
    return {
      Program(program: ProgramStatement & { body: ProgramStatement[] }) {
        const functions = collectTopLevelFunctions(program);

        if (functions.length < 2) {
          return;
        }

        const primaryFunctionName = findPrimaryFunctionName(
          program,
          functions,
          context.filename,
        );

        if (primaryFunctionName === null) {
          return;
        }

        if (functions[0]?.name === primaryFunctionName) {
          return;
        }

        const primaryFunction = functions.find(
          (item) => item.name === primaryFunctionName,
        );

        if (primaryFunction === undefined) {
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

export default rule;

function collectTopLevelFunctions(
  program: ProgramStatement & { body: ProgramStatement[] },
): TopLevelFunction[] {
  const functions: TopLevelFunction[] = [];

  for (const [index, statement] of program.body.entries()) {
    const declaration = unwrapTopLevelStatement(statement);

    if (
      declaration?.type === "FunctionDeclaration" &&
      declaration.id !== null &&
      declaration.id !== undefined
    ) {
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

    for (const declarator of declaration.declarations ?? []) {
      if (
        declarator.id.type !== "Identifier" ||
        !isFunctionExpression(declarator.init)
      ) {
        continue;
      }

      if (declarator.id.name === undefined) {
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

function findPrimaryFunctionName(
  program: ProgramStatement & { body: ProgramStatement[] },
  functions: TopLevelFunction[],
  filename: string,
): string | null {
  const names = new Set(functions.map((item) => item.name));

  return (
    findDefaultExportedFunctionName(program, names) ??
    findSoleExportedFunctionName(program, names) ??
    findFileNamedFunctionName(filename, names)
  );
}

function findDefaultExportedFunctionName(
  program: ProgramStatement & { body: ProgramStatement[] },
  names: Set<string>,
): string | null {
  for (const statement of program.body) {
    if (statement.type !== "ExportDefaultDeclaration") {
      continue;
    }

    const declaration = statement.declaration;

    if (
      declaration?.type === "FunctionDeclaration" &&
      declaration.id !== null &&
      declaration.id !== undefined
    ) {
      return declaration.id.name;
    }

    if (
      declaration?.type === "Identifier" &&
      declaration.name !== undefined &&
      names.has(declaration.name)
    ) {
      return declaration.name;
    }
  }

  return null;
}

function findSoleExportedFunctionName(
  program: ProgramStatement & { body: ProgramStatement[] },
  names: Set<string>,
): string | null {
  const exportedNames: string[] = [];

  for (const statement of program.body) {
    if (statement.type !== "ExportNamedDeclaration") {
      continue;
    }

    const declaration = statement.declaration;

    if (
      declaration?.type === "FunctionDeclaration" &&
      declaration.id !== null &&
      declaration.id !== undefined
    ) {
      exportedNames.push(declaration.id.name);
      continue;
    }

    if (declaration?.type !== "VariableDeclaration") {
      continue;
    }

    for (const declarator of declaration.declarations ?? []) {
      if (
        declarator.id.type === "Identifier" &&
        declarator.id.name !== undefined &&
        isFunctionExpression(declarator.init)
      ) {
        exportedNames.push(declarator.id.name);
      }
    }
  }

  if (exportedNames.length !== 1) {
    return null;
  }

  const exportedName = exportedNames[0];
  if (exportedName === undefined) {
    return null;
  }

  return names.has(exportedName) ? exportedName : null;
}

function findFileNamedFunctionName(
  filename: string,
  names: Set<string>,
): string | null {
  if (typeof filename !== "string" || filename.length === 0) {
    return null;
  }

  const baseName = path.basename(filename, path.extname(filename));
  return names.has(baseName) ? baseName : null;
}

function unwrapTopLevelStatement(
  statement: ProgramStatement,
): ProgramStatement | null {
  if (
    statement.type === "ExportDefaultDeclaration" ||
    statement.type === "ExportNamedDeclaration"
  ) {
    return statement.declaration ?? null;
  }

  return statement;
}

function isFunctionExpression(
  node: { type?: string } | null | undefined,
): boolean {
  return (
    node?.type === "ArrowFunctionExpression" ||
    node?.type === "FunctionExpression"
  );
}
