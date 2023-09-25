function* potentialValueNodes(node, func) {
  if (!node) {
    return;
  }

  switch (node.type) {
    case "JSXExpressionContainer":
      yield* potentialValueNodes(node.expression, func);
      break;
    case "LogicalExpression":
      yield* potentialValueNodes(node.left, func);
      yield* potentialValueNodes(node.right, func);
      break;
    case "ConditionalExpression":
      yield* potentialValueNodes(node.consequent, func);
      yield* potentialValueNodes(node.alternate, func);
      break;
    case "AssignmentExpression":
      yield* potentialValueNodes(node.right, func);
      break;
    default:
      yield node;
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

function isAttrWithName(node, name) {
  return (
    node.type === "JSXAttribute" &&
    node.name.type === "JSXIdentifier" &&
    node.name.name === name
  );
}

module.exports = {
  potentialValueNodes,
  getStaticValue,
  isAttrWithName,
};
