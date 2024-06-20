// The MIT License (MIT)

// Copyright (c) 2015 typicode

// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// json-server https://github.com/typicode/json-server
//

const _ = require('lodash');

function validateKey(key) {
  if (key.indexOf('/') !== -1) {
    const msg = [
      `Oops, found / character in database property '${key}'.`,
      '',
      "/ aren't supported, if you want to tweak default routes, see",
      'https://github.com/typicode/json-server/#add-custom-routes',
    ].join('\n')
    throw new Error(msg)
  }
}

module.exports = (obj) => {
  if (_.isPlainObject(obj)) {
    Object.keys(obj).forEach(validateKey)
  } else {
    throw new Error(
      `Data must be an object. Found ${typeof obj}.` +
        'See https://github.com/typicode/json-server for example.'
    )
  }
}