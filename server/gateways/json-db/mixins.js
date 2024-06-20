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

const { nanoid } = require('nanoid');
const pluralize = require('pluralize');

module.exports = {
  getRemovable,
  createId,
  deepQuery,
}

// Returns document ids that have unsatisfied relations
// Example: a comment that references a post that doesn't exist
function getRemovable(db, opts) {
  const _ = this
  const removable = []
  _.each(db, (coll, collName) => {
    _.each(coll, (doc) => {
      _.each(doc, (value, key) => {
        if (new RegExp(`${opts.foreignKeySuffix}$`).test(key)) {
          // Remove foreign key suffix and pluralize it
          // Example postId -> posts
          const refName = pluralize.plural(
            key.replace(new RegExp(`${opts.foreignKeySuffix}$`), '')
          )
          // Test if table exists
          if (db[refName]) {
            // Test if references is defined in table
            const ref = _.getById(db[refName], value)
            if (_.isUndefined(ref)) {
              removable.push({ name: collName, id: doc.id })
            }
          }
        }
      })
    })
  })

  return removable
}

// Return incremented id or uuid
// Used to override lodash-id's createId with utils.createId
function createId(coll) {
  const _ = this
  const idProperty = _.__id()
  if (_.isEmpty(coll)) {
    return 1
  } else {
    let id = _(coll).maxBy(idProperty)[idProperty]

    // Increment integer id or generate string id
    return _.isFinite(id) ? ++id : nanoid(7)
  }
}

function deepQuery(value, q) {
  const _ = this
  if (value && q) {
    if (_.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (_.deepQuery(value[i], q)) {
          return true
        }
      }
    } else if (_.isObject(value) && !_.isArray(value)) {
      for (const k in value) {
        if (_.deepQuery(value[k], q)) {
          return true
        }
      }
    } else if (value.toString().toLowerCase().indexOf(q) !== -1) {
      return true
    }
  }
}