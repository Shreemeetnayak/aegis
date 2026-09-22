module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  overrides: [
    {
      files: ['backend/**/*.js'],
      env: {
        node: true,
        jest: true,
      },
      rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      },
    },
    {
      files: ['frontend/**/*.{js,jsx}'],
      env: {
        browser: true,
      },
      extends: ['eslint:recommended', 'plugin:react/recommended'],
      plugins: ['react'],
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      },
    },
  ],
  ignorePatterns: ['node_modules/', 'dist/', 'backend/data/'],
};
