# @shimful/eslint-plugin-react-lite [![tests](https://github.com/shimful/eslint-plugin-react-lite/actions/workflows/tests.yml/badge.svg)](https://github.com/shimful/eslint-plugin-react-lite/actions/workflows/tests.yml)

This package is reimplements the most essential (with some definition of most essential) eslint-plugin-react rules, and aims to do it with zero dependencies.

## Configuration

```json
{
  "settings": {
    "reactLite": {
      // The pragma to use, defaults to "React"
      "pragma": "React",
      // Fragment to use, defaults to "Fragment"
      "fragment": "Fragment",
      // The jsxFactory, defaults to `${pragma}.createElement`
      // Can be overwritten on per-file basis, e.g.:
      //   /* @jsx Preact.h */
      "jsxFactory": "React.createElement",
      // The jsxFactory, defaults to `${pragma}.${fragment}`
      // Can be overwritten on per-file basis, e.g.:
      //   /* @jsxFrag Preact.Fragment */
      "jsxFragmentFactory": "React.Fragment"
    },
    // Defaults to []
    "linkComponents": [
      { "name": "Link", "linkAttribute": "to" }
    ],
    // Defaults to []
    "formComponents": [
      { "name": "Form", "formAttribute": "action" }
    ]
  }
}
```

## Rules

### jsx-key

```json
{
  "rules": {
    "react-lite/jsx-key": ["error", {
      "checkFragmentShorthand": false,
      "checkKeyMustBeforeSpread": false,
      "warnOnDuplicates": true
    }]
  }
```

### jsx-no-comment-textnodes

```json
{
  "rules": {
    "react-lite/jsx-no-comment-textnodes": "error"
  }
```

Notes:

 * Autofixes not implemented.

### jsx-no-target-blank

```json
{
  "rules": {
    "react-lite/jsx-no-comment-textnodes": ["error", {
      "allowReferrer": false,
      "enforceDynamicLinks": "always", // Options: "always", "never".
      "warnOnSpreadAttributes": false,
      "links": true,
      "forms": false
    }]
  }
```

## Status

These are the current recommended set of eslint-plugin-react rules. Included are some notes whether they're needed anymore, or better handled by other mechanisms like TypeScript's type checks.

|    | implemented | rule                       | notes |
|----|--|--------------------------|-|
| ❓  |  | display-name               | Is this relevant in 2023? |
| ✅ | 🎉 | jsx-key                    | |
| ✅ | 🎉 | jsx-no-comment-textnodes   | |
| TS |  | jsx-no-duplicate-props     | TypeScript complains about duplicate props. |
| ✅ | 🎉 | jsx-no-target-blank        | |
| TS |  | jsx-no-undef               | TypeScript complains about undefined variables. |
| TS  |  | jsx-uses-react             | `plugin:react/jsx-runtime` disables this. Either TypeScript's "noUnusedLocals" or @typescript-eslint's corresponding rule take care of this. |
| 💀 |  | jsx-uses-vars              | Doesn't seem to be necessary anymore, even with ESLint's no-unused-vars rule on. |
| TS |  | no-children-prop           | | TypeScript warns about duplicate props.
| ✅ |  | no-danger-with-children    | |
| ~✅   |  | no-deprecated              | Partially taken care of React's type definitions. |
| ~✅   |  | no-direct-mutation-state   | Somewhat outdated as-is. Works only for createClass & class components. |
| 💀 |  | no-find-dom-node           | Doesn't seem to be a part of @types/react. |
| 💀 |  | no-is-mounted              | Applies only to the obsolete `React.createClass` and `create-react-class`. Not worth supporting? |
| ❓   |  | no-render-return-value     | Doesn't allow usage of ReactDOM.render's return value, as in the future it'll be `void`. Wouldn't typings take care of this? |
| 💀❓ |  | no-string-refs             | React 19 removes support for string refs, so types _probably_ will take care of this in the near future. |
| ✅  |  | no-unescaped-entities      | |
| TS |  | no-unknown-property        | Taken care of by TS, except arbitrary aria-* and data-* props are allowed |
| ❓   |  | prop-types                 | Would this be taken care of by TS? |
| TS  |  | react-in-jsx-scope         | `plugin:react/jsx-runtime` disables this. TypeScript seems to do the right thing based on tsconfig.json's `"jsx"` setting (e.g. complain when `"jsx": "react"` but not when `"jsx": "preserve"`). |
| TS  |  | require-render-return      | |

 * ✅ = worth supporting
 * 💀 = obsolete
 * ❓ = needs investigation
 * TS = taken care by TypeScript checks

## License

This library is licensed under the MIT license. See [LICENSE](./LICENSE).
