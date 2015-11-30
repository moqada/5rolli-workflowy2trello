# 5rolli-workflowy2trello

[![NPM version][npm-image]][npm-url]
[![NPM downloads][npm-download-image]][npm-download-url]
[![Build Status][travis-image]][travis-url]
[![Coverage Status][codecov-image]][codecov-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![DevDependency Status][daviddm-dev-image]][daviddm-dev-url]
[![License][license-image]][license-url]

Convert Workflowy list to Trello cards for [5ROLLI](https://github.com/tongariboyz/5rolli).


## Installation

```
npm install -g 5rolli-workflowy2trello
```


## Usage

1. Export OPML file from Workflowy
2. Put `.5rolliw2t.json` to current directory (copy from [`./.5rolliw2t.example.json``](./.5rolliw2t.example.json))
3. Execute dry-run: `5rolliw2t ./path/to/opml -o cards.json --dry-run --send-trello`
4. Execute to Register cards: `5rolliw2t ./path/to/opml -o cards.json --send-trello`

```
Usage: 5rolliw2t [options] <OPML_FILE>

Options:
  -c, --config   Set config file path  [string] [default: "./.5rolliw2t.json"]
  -f, --format   Set output format  [choices: "trello", "story"] [default: "trello"]
  -o, --output   Set output file path  [string]
  --send-trello  Send cards to Trello  [boolean]
  --dry-run      Set flag for dryrun to send-trello  [boolean]
  --help         Show help  [boolean]
  --version      Show version number  [boolean]

Examples:
  5rolliw2t /path/to/file.opml                        Output cards json to stdout
  5rolliw2t /path/to/file.opml -o /path/to/file.json  Output cards json to file
  5rolliw2t /path/to/file.opml --send-trello          Register cards to Trello
```


[npm-url]: https://www.npmjs.com/package/5rolli-workflowy2trello
[npm-image]: https://img.shields.io/npm/v/5rolli-workflowy2trello.svg?style=flat-square
[npm-download-url]: https://www.npmjs.com/package/5rolli-workflowy2trello
[npm-download-image]: https://img.shields.io/npm/dt/5rolli-workflowy2trello.svg?style=flat-square
[travis-url]: https://travis-ci.org/moqada/5rolli-workflowy2trello
[travis-image]: https://img.shields.io/travis/moqada/5rolli-workflowy2trello.svg?style=flat-square
[daviddm-url]: https://david-dm.org/moqada/5rolli-workflowy2trello
[daviddm-image]: https://img.shields.io/david/moqada/5rolli-workflowy2trello.svg?style=flat-square
[daviddm-dev-url]: https://david-dm.org/moqada/5rolli-workflowy2trello#info=devDependencies
[daviddm-dev-image]: https://img.shields.io/david/dev/moqada/5rolli-workflowy2trello.svg?style=flat-square
[codecov-url]: https://codecov.io/github/moqada/5rolli-workflowy2trello
[codecov-image]: https://img.shields.io/codecov/c/github/moqada/5rolli-workflowy2trello.svg?style=flat-square
[license-url]: http://opensource.org/licenses/MIT
[license-image]: https://img.shields.io/npm/l/5rolli-workflowy2trello.svg?style=flat-square
