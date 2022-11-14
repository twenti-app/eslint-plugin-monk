<p align="center">
  <a href="https://github.com/twenti-app">
    <img alt="eslint-plugin-monk" src="https://user-images.githubusercontent.com/59294466/201776775-f9bce1c1-727c-475f-b3d9-62e69b56bc0b.gif">
    <h1 align="center">Monk ESLint plugin</h1>
  </a>
</p>
<p align="center">
    <a href="https://packagephobia.now.sh/result?p=eslint-plugin-monk">
      <img alt="A simple way of sorting your imports and exports" longdesc="A simple way of sorting your imports and exports" src="https://flat.badgen.net/packagephobia/install/eslint-plugin-monk" />
    </a>
</p>

# Installation
```sh
npm install --save-dev eslint-plugin-monk
```
# Features
# Usage
- Add `monk` to **plugins** in your .eslintrc file:
```js
  plugins: ['react', '@typescript-eslint', 'monk'],
```
- Then add the rules for sorting imports and exports:
```js
 rules: {
    'monk/imports': 'error',
    'monk/exports': 'error'
  }
```
<p align="center">
  <img alt="eslint-plugin-monk" src="https://user-images.githubusercontent.com/59294466/201775827-39175535-2844-4d7e-b616-9f8562c96969.gif">
</p>


