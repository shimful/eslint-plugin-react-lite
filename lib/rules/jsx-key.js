"use strict";

const {
  resolvePragmas,
  isAttrWithName,
  potentialValueNodes,
  getStaticValue,
} = require("../utils.js");

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
      missingFragmentKey: `Missing "key" prop for element in {{container}}. Shorthand fragment tags do not support key props: use {{jsxFrag}} instead.`,
      keyBeforeSpread: `"key" prop must appear before a spread ({...props}).`,
      nonUniqueKeys: `"key" props must be unique.`,
    },
  },

  create(context) {
    const pragmas = resolvePragmas(context);
    const options = context.options[0] ?? {};

    const {
      checkFragmentShorthand = false,
      checkKeyMustBeforeSpread = false,
      warnOnDuplicates = true,
    } = options;

    function reportMissingKey(node, container) {
      if (node.type === "JSXElement") {
        let seenKey = false;
        for (const attribute of node.openingElement.attributes) {
          if (isAttrWithName(attribute, "key")) {
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
          data: { container, jsxFrag: pragmas.jsxFrag },
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
          if (!isAttrWithName(attribute, "key")) {
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
        for (const node of potentialValueNodes(result)) {
          reportMissingKey(node, "iterator");
        }
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
            if (isAttrWithName(attribute, "key")) {
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
