#!/usr/bin/env node

/* eslint global-require: 0 */
import fs from 'fs';

import opmlToJSON from 'opml-to-json';
import updateNotifier from 'update-notifier';
import yargs from 'yargs';

import {
  sendTrello,
  storiesToCards,
  opmlToStories
} from './';
import pkg from '../package.json';


updateNotifier({pkg}).notify();

const argv = yargs
  .usage('Usage: 5rolliw2t [options] <OPML_FILE>')
  .example('5rolliw2t /path/to/file.opml', 'Output cards json to stdout')
  .example('5rolliw2t /path/to/file.opml -o /path/to/file.json', 'Output cards json to file')
  .example('5rolliw2t /path/to/file.opml --send-trello', 'Register cards to Trello')
  .option('c', {
    alias: 'config',
    description: 'Set config file path',
    type: 'string',
    'default': './.5rolliw2t.json'
  })
  .option('f', {
    alias: 'format',
    description: 'Set output format',
    choices: ['trello', 'story'],
    'default': 'trello'
  })
  .option('o', {
    alias: 'output',
    description: 'Set output file path',
    type: 'string'
  })
  .option('send-trello', {
    description: 'Send cards to Trello',
    type: 'boolean'
  })
  .option('dry-run', {
    description: 'Set flag for dryrun to send-trello',
    type: 'boolean'
  })
  .help('help')
  .demand(1)
  .version(pkg.version)
  .detectLocale(false)
  .wrap(null)
  .strict()
  .argv;


/**
 * format JSON
 *
 * @param {Object} json json
 * @return {string}
 */
function formatJSON(json) {
  return JSON.stringify(json, null, 2);
}


/**
 * execute
 *
 * @param {Object} args yargs object
 */
function execute(args) {
  const opml = fs.readFileSync(args._[0]);
  const config = loadConfig(args.config);
  if (args.sendTrello && args.format === 'story') {
    throw new Error('send-trello and format=story cannot specify together');
  }
  opmlToJSON(opml.toString(), (err, json) => {
    if (err) {
      throw err;
    }
    let promise = opmlToStories(json);
    if (args.format === 'trello') {
      promise = promise.then(stories => {
        return storiesToCards(stories, config);
      }).catch(e => {
        console.error(e);
      });
    }
    if (args.sendTrello) {
      promise = promise.then(cards => {
        return Promise.all([sendTrello(cards, config, args.dryRun), cards]);
      }).then(res => {
        if (args.dryRun) {
          console.log(formatJSON(res[0].validCards));
        } else {
          console.log(formatJSON(res[0].responses));
        }
        return res[0];
      });
    }
    if (args.output) {
      promise = promise.then(results => {
        const data = formatJSON(results);
        return new Promise((resolve, reject) => {
          fs.writeFile(args.output, data, e => {
            if (e) {
              reject(e);
            }
            resolve(true);
          });
        });
      });
    } else {
      promise = promise.then(results => {
        console.log(formatJSON(results));
        return results;
      });
    }
    promise.then(() => process.exit()).catch(errs => {
      errs.forEach(console.error);
      process.exit(1);
    });
  });
}


/**
 * load config file
 *
 * @param {string} filePath config file path
 * @return {Object}
 */
function loadConfig(filePath) {
  const data = fs.readFileSync(filePath);
  return JSON.parse(data);
}


try {
  execute(argv);
} catch (e) {
  console.error(e);
  process.exit(1);
}
