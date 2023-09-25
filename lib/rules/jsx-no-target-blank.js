"use strict";

const {
  isAttrWithName,
  potentialValueNodes,
  getStaticValue,
} = require("../utils.js");

function findAttr(node, name) {
  const index = node.attributes.findLastIndex((a) => isAttrWithName(a, name));
  if (index < 0) {
    return undefined;
  }
  return { index, node: node.attributes[index] };
}

// RFC 1738 section 2.1 (https://datatracker.ietf.org/doc/html/rfc1738#section-2.1):
//   "Scheme names consist of a sequence of characters. The lower case
//    letters "a"--"z", digits, and the characters plus ("+"), period
//    ("."), and hyphen ("-") are allowed. For resiliency, programs
//    interpreting URLs should treat upper case letters as equivalent to
//    lower case in scheme names (e.g., allow "HTTP" as well as "http")"
const EXTERNAL_LINK_RE = /^([a-z0-9+-.]+:|\/\/)/i;

function isExternalLink(node) {
  if (node.value?.type !== "Literal") {
    return;
  }
  const value = node.value.value;
  return typeof value === "string" && EXTERNAL_LINK_RE.test(value.trim());
}

function isDynamicLink(node) {
  return node.value?.type === "JSXExpressionContainer";
}

module.exports = {
  meta: {
    type: "problem",

    fixable: "code",

    schema: [
      {
        type: "object",
        properties: {
          allowReferrer: {
            type: "boolean",
          },
          enforceDynamicLinks: {
            enum: ["always", "never"],
          },
          warnOnSpreadAttributes: {
            type: "boolean",
          },
          links: {
            type: "boolean",
          },
          forms: {
            type: "boolean",
          },
        },
        additionalProperties: false,
      },
    ],

    messages: {
      noTargetBlankWithoutNoreferrer: `Using target="_blank" without rel="noreferrer" (which implies rel="noopener") is a security risk in older browsers: see https://mathiasbynens.github.io/rel-noopener/#recommendations`,
      noTargetBlankWithoutNoopener: `Using target="_blank" without rel="noreferrer" or rel="noopener" (the former implies the latter and is preferred due to wider support) is a security risk: see https://mathiasbynens.github.io/rel-noopener/#recommendations`,
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const settings = context.settings;

    const linkComponents = new Map();
    for (const c of ["a", ...(settings.linkComponents ?? [])] ?? []) {
      if (typeof c === "string") {
        linkComponents.set(c, "href");
      } else {
        linkComponents.set(c.name, c.linkAttribute);
      }
    }

    const formComponents = new Map();
    for (const c of ["form", ...(settings.formComponents ?? [])] ?? []) {
      if (typeof c === "string") {
        formComponents.set(c, "action");
      } else {
        formComponents.set(c.name, c.formAttribute);
      }
    }

    const {
      allowReferrer = false,
      enforceDynamicLinks = "always",
      warnOnSpreadAttributes = false,
      links = true,
      forms = false,
    } = options;

    function mayHaveUnsafeLink(node, linkAttr, spreadIdx) {
      const link = findAttr(node, linkAttr);
      if (!link) {
        return spreadIdx >= 0;
      }
      if (spreadIdx > link.index) {
        return true;
      }
      return (
        isExternalLink(link.node) ||
        (enforceDynamicLinks === "always" && isDynamicLink(link.node))
      );
    }

    function mayHaveTargetBlank(node, spreadIdx) {
      const target = findAttr(node, "target");
      if (!target) {
        return spreadIdx >= 0;
      }
      if (spreadIdx > target.index) {
        return true;
      }

      for (const valueNode of potentialValueNodes(target.node.value)) {
        const { ok, value } = getStaticValue(valueNode);
        if (ok && value === "_blank") {
          return true;
        }
      }
      return false;
    }

    function mayHaveUnsafeRel(node, spreadIdx) {
      const rel = findAttr(node, "rel");
      if (!rel || spreadIdx > rel.index || !rel.node.value) {
        return true;
      }

      for (const valueNode of potentialValueNodes(rel.node.value)) {
        const { ok, value } = getStaticValue(valueNode);
        if (!ok || typeof value !== "string") {
          return true;
        }
        const keywords = value.toLowerCase().trim().split(/\s+/g);
        if (keywords.includes("noreferrer")) {
          continue;
        }
        if (!allowReferrer) {
          return true;
        } else if (!keywords.includes("noopener")) {
          return true;
        }
      }
      return false;
    }

    function check(node, components) {
      const linkAttr = components.get(node.name.name);
      if (linkAttr === undefined) {
        return;
      }

      const spreadIdx = warnOnSpreadAttributes
        ? node.attributes.findLastIndex((a) => a.type === "JSXSpreadAttribute")
        : -1;

      if (mayHaveUnsafeLink(node, linkAttr, spreadIdx)) {
        if (!mayHaveTargetBlank(node, spreadIdx)) {
          return;
        }
        if (mayHaveUnsafeRel(node, spreadIdx)) {
          context.report({
            node,
            messageId: allowReferrer
              ? "noTargetBlankWithoutNoopener"
              : "noTargetBlankWithoutNoreferrer",
            fix(fixer) {
              const lastAttr = node.attributes[node.attributes.length - 1];
              if (!lastAttr) {
                return null;
              }

              const rel = findAttr(node, "rel");
              if (!rel) {
                return spreadIdx >= 0
                  ? null
                  : fixer.insertTextAfter(lastAttr, ` rel="noreferrer"`);
              }
              if (spreadIdx > rel.index) {
                return null;
              }

              const value = rel.node.value;
              if (!value) {
                return fixer.replaceText(rel.node, `rel="noreferrer"`);
              }

              if (value.type === "Literal") {
                if (typeof value.value !== "string") {
                  return null;
                }
                const text = value.raw.slice(0, -1) + ` noreferrer"`;
                return fixer.replaceText(value, text);
              }

              if (value.type === "JSXExpressionContainer") {
                const expr = value.expression;
                if (expr.type !== "Literal") {
                  return null;
                }
                if (typeof expr.value !== "string") {
                  return fixer.replaceText(value, `"noreferrer"`);
                }
                const text = expr.raw.slice(0, -1) + ` noreferrer"`;
                return fixer.replaceText(expr, text);
              }

              return null;
            },
          });
        }
      }
    }

    return {
      JSXOpeningElement(node) {
        if (links) {
          check(node, linkComponents);
        }
        if (forms) {
          check(node, formComponents);
        }
      },
    };
  },
};
