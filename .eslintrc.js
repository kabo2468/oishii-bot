module.exports = {
    "env": {
        "es2021": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
        "prettier/@typescript-eslint"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
        "semi": "off",
        "@typescript-eslint/semi": [
            "error"
        ],
        "prefer-exponentiation-operator": "error",
        "camelcase": "error",
        "comma-spacing": "error",
        "space-infix-ops": "error"
    }
};