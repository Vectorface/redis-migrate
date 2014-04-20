redis-migrate
=============

CLI tool to create and run redis key migrations. A migration file consists of
a single exported object with two keys: `up` and `down`. The current release is
designed to be backwards compatible with Redis 2.6 and 2.4. As such, it uses
`KEYS`, which is blocking and should not be used on a production db when dealing
with any significant number of keys. Future releases will allow for non-blocking
operation using `SCAN`, `HSCAN`, etc.

#### Installation

It can be installed via `npm` using:

```
npm install -g redis-migrate
```

#### Usage

```
Usage: redis-migrate [up|down|create] <migrationName>

Options:

  -h, --help     output usage information
  -V, --version  output the version number
```

#### Example Migration File

``` javascript
exports.up = [
  {
    func: 'moveKeysToHashFields',
    src:  {key: /(app:user:\d+):address/},
    dst:  {key: '$1:properties', field: 'address'}
  },
  {
    func: 'renameKeys',
    src:  {key: /(app:post:\d+):lastModifiedTimestamp/},
    dst:  {key: '$1:lastModified'}
  }
];

exports.down = [
  {
    func: 'moveHashFieldsToKeys',
    src:  {key: /(app:user:\d+):properties/, field: 'address'},
    dst:  {key: '$1:address'}
  },

  {
    func: 'renameKeys',
    src:  {key: /(app:post:\d+):lastModified/},
    dst:  {key: '$1:lastModifiedTimestamp'}
  }
];
```
