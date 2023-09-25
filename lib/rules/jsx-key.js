function isKeyAttribute(node) {
  return (
    node.type === "JSXAttribute" &&
    node.name.type === "JSXIdentifier" &&
    node.name.name === "key"
  );
}

function forEachPotentialResult(node, func) {
  if (!node) {
    return;
  }

  switch (node.type) {
    case "LogicalExpression":
      forEachPotentialResult(node.left, func);
      forEachPotentialResult(node.right, func);
      break;
    case "ConditionalExpression":
      forEachPotentialResult(node.consequent, func);
      forEachPotentialResult(node.alternate, func);
      break;
    case "AssignmentExpression":
      forEachPotentialResult(node.right, func);
      break;
    default:
      func(node);
  }
}

function getStaticValue(node) {
  if (!node) {
    return { ok: false, value: undefined };
  }

  switch (node.type) {
    case "JSXExpressionContainer":
      return getStaticValue(node.expression);
    case "Literal":
      return { ok: true, value: node.value };
    case "TemplateLiteral": {
      const values = [];
      for (const expr of node.expressions) {
        const { ok, value } = getStaticValue(expr);
        if (!ok) {
          return { ok: false, value: undefined };
        }
        values.push(value);
      }

      return {
        ok: true,
        value: node.quasis
          .map((q, i) => {
            if (q.tail) {
              return q.value.cooked;
            } else {
              return q.value.cooked + String(values[i]);
            }
          })
          .join(""),
      };
    }
    default:
      return { ok: false, value: undefined };
  }
}

const PRAGMA_REX = /^\s*\*?\s*@(jsx|jsxFrag)\s+(\S+)\s*$/gm;

function findPragmas(context) {
  const pragmas = Object.create(null);
  for (const comment of context.sourceCode.getAllComments()) {
    for (const match of comment.value.matchAll(PRAGMA_REX)) {
      pragmas[match[1]] = match[2];
    }
  }
  return pragmas;
}

module.exports = {
  meta: {
    type: "problem",

    schema: [
      {
        type: "object",
        properties: {
          checkFragmentShorthand: {
            type: "boolean",
          },
          checkKeyMustBeforeSpread: {
            type: "boolean",
          },
          warnOnDuplicates: {
            type: "boolean",
          },
        },
        additionalProperties: false,
      },
    ],

    messages: {
      missingElementKey: `Missing "key" prop for element in {{container}}.`,
      missingFragmentKey: `Missing "key" prop for element in {{container}}. Shorthand fragment tags do not support key props: use {{jsxFragmentFactory}} instead.`,
      keyBeforeSpread: `"key" prop must appear before a spread ({...props}).`,
      nonUniqueKeys: `"key" props must be unique.`,
    },
  },

  create(context) {
    const pragmas = findPragmas(context);
    const options = context.options[0] ?? {};
    const settings = context.settings.react ?? {};

    const jsxFragmentFactory =
      pragmas.jsxFrag ??
      settings.jsxFragmentFactory ??
      `${settings.pragma ?? "React"}.${settings.fragment ?? "Fragment"}`;

    const {
      checkFragmentShorthand = false,
      checkKeyMustBeforeSpread = false,
      warnOnDuplicates = true,
    } = options;

    function reportMissingKey(node, container) {
      if (node.type === "JSXElement") {
        let seenKey = false;
        for (const attribute of node.openingElement.attributes) {
          if (isKeyAttribute(attribute)) {
            seenKey = true;
            break;
          }
        }
        if (!seenKey) {
          context.report({
            node,
            messageId: "missingElementKey",
            data: { container },
          });
        }
      } else if (node.type === "JSXFragment" && checkFragmentShorthand) {
        context.report({
          node,
          messageId: "missingFragmentKey",
          data: { container, jsxFragmentFactory },
        });
      }
    }

    function reportDuplicateKeys(nodes) {
      if (!warnOnDuplicates) {
        return;
      }

      const dupes = new Map();
      for (const node of nodes) {
        if (node.type !== "JSXElement") {
          continue;
        }

        for (const attribute of node.openingElement.attributes) {
          if (!isKeyAttribute(attribute)) {
            continue;
          }

          const { ok, value } = getStaticValue(attribute.value);
          if (!ok) {
            continue;
          }

          const prev = dupes.get(value);
          if (!prev) {
            dupes.set(value, { node: attribute, reported: false });
          } else {
            if (!prev.reported) {
              context.report({ node, messageId: "nonUniqueKeys" });
              prev.reported = true;
            }
            context.report({ node: attribute, messageId: "nonUniqueKeys" });
          }
        }
      }
    }

    function checkFunctionResults(functionNode) {
      const results = functionNodes.get(functionNode);
      if (!results) {
        return;
      }
      for (const result of results) {
        forEachPotentialResult(result, (node) => {
          reportMissingKey(node, "iterator");
        });
      }
    }

    function isChildrenToArrayNode(node) {
      if (node.type !== "CallExpression") {
        return false;
      }

      const { callee } = node;
      if (callee.type !== "MemberExpression") {
        return false;
      }

      const { object: o, property: p } = callee;
      if (p.type !== "Identifier" || p.name !== "toArray") {
        return false;
      }

      if (o.type === "Identifier" && o.name === "Children") {
        return true;
      } else if (
        o.type === "MemberExpression" &&
        o.object.type === "Identifier" &&
        o.property.type === "Identifier" &&
        o.property.name === "Children"
      ) {
        return true;
      }
      return false;
    }

    let childrenToArrayDepth = 0;
    const funcInfoStack = [];
    const functionNodes = new WeakMap();
    return {
      CallExpression(node) {
        if (isChildrenToArrayNode(node)) {
          childrenToArrayDepth++;
        }
      },

      "CallExpression:exit"(node) {
        if (isChildrenToArrayNode(node)) {
          childrenToArrayDepth--;
        }
      },

      onCodePathStart(_codePath, _node) {
        funcInfoStack.push({
          results: [],
        });
      },

      onCodePathEnd(codePath, node) {
        const funcInfo = funcInfoStack.pop();
        if (codePath.origin !== "function") {
          return;
        }

        const { results } = funcInfo;
        if (node.type === "ArrowFunctionExpression" && node.expression) {
          results.push(node.body);
        }
        functionNodes.set(node, results);
      },

      ReturnStatement(node) {
        if (!node.argument) {
          return;
        }
        const funcInfo = funcInfoStack[funcInfoStack.length - 1];
        funcInfo?.results.push(node.argument);
      },

      JSXElement(node) {
        if (childrenToArrayDepth > 0) {
          return;
        }
        if (checkKeyMustBeforeSpread) {
          let seenKey = false;
          for (const attribute of node.attributes) {
            if (isKeyAttribute(attribute)) {
              seenKey = true;
            } else if (attribute.type === "JSXSpreadAttribute") {
              if (!seenKey) {
                context.report({ node, messageId: "keyBeforeSpread" });
              }
              break;
            }
          }
        }
        reportDuplicateKeys(node.children);
      },

      JSXFragment(node) {
        if (childrenToArrayDepth > 0) {
          return;
        }
        reportDuplicateKeys(node.children);
      },

      ArrayExpression(node) {
        if (childrenToArrayDepth > 0) {
          return;
        }

        for (const child of node.elements) {
          reportMissingKey(child, "array");
        }
        reportDuplicateKeys(node.elements);
      },

      // Check Array#map callback return values
      ':matches(CallExpression, OptionalCallExpression):matches([callee.type="MemberExpression"],[callee.type="OptionalMemberExpression"])[callee.property.name="map"]:exit'(
        node,
      ) {
        if (childrenToArrayDepth > 0) {
          return;
        }
        if (node.arguments.length >= 1) {
          checkFunctionResults(node.arguments[0]);
        }
      },

      // Check Array.from callback return values
      'CallExpression[callee.type="MemberExpression"][callee.property.name="from"]:exit'(
        node,
      ) {
        if (childrenToArrayDepth > 0) {
          return;
        }
        if (node.arguments.length >= 2) {
          checkFunctionResults(node.arguments[1]);
        }
      },
    };
  },
};
