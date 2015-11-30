import Trello from 'node-trello';


/**
 * Parse Error
 */
class ParseError extends Error {
  /**
   * constructor
   *
   * @param {string} type error type
   * @param {string} message error message
   * @param {string} text raw text
   */
  constructor({type, message, text}) {
    super(`(${type}): ${message} "${text}"`);
    this.name = this.constructor.name;
    this.type = type;
    this.text = text;
    Error.captureStackTrace(this, this.constructor.name);
  }
}


/**
 * Create name for Trello card
 *
 * @param {Object} story story
 * @return {string}
 */
function createCardName(story) {
  const items = [`${story.id}:`];
  if (story.times) {
    const timeStr = [story.times.spent, story.times.es50, story.times.es90]
      .filter(i => i !== undefined)
      .map(i => i.toString())
      .join('/');
    if (timeStr) {
      items.push(`(${timeStr})`);
    }
  }
  items.push(`${story.title}`);
  if (story.parentId) {
    items.push(`#${story.parentId}`);
  }
  if (story.dependIds.length > 0) {
    items.push(`${story.dependIds.map(i => `&${i}`).join(' ')}`);
  }
  return items.join(' ');
}


/**
 * is Story
 *
 * @param {string} text text
 * @return {boolean}
 */
function isStory(text) {
  return /^#(\d+)_/.test(text);
}


/**
 * Parse text to times
 *
 * @param {string} text title text
 * @return {Object}
 */
function parseTextToTimes(text) {
  const match = /(?:\((?:(\d+)\/)?(\d+)\/(\d+)\)\s+)?(.*)$/.exec(text);
  if (match) {
    const [spent, es50, es90, body] = match.slice(1);
    return {
      body: body.trim(),
      times: {
        spent: spent && Number.parseInt(spent, 10),
        es50: es50 && Number.parseInt(es50, 10),
        es90: es90 && Number.parseInt(es90, 10)
      }
    };
  }
  return {
    body: text.trim(),
    times: null
  };
}


/**
 * Parse text to labels
 *
 * must to use after parseTextToTimes()
 *
 * @param {string} text title text
 * @return {Object}
 */
function parseTextToLabels(text) {
  const matches = /^(?:\[(.+)\]\s+)?(.*)$/.exec(text);
  if (!matches) {
    return {
      body: text.trim(),
      labels: []
    };
  }
  const [labels, body] = matches.slice(1);
  return {
    body: body.trim(),
    labels: labels ? labels.split(',').map(l => l.trim()).filter(l => l) : []
  };
}


/**
 * Parse text to raw story object
 *
 * @param {string} text text
 * @return {Object}
 */
function parseTextToStory(text) {
  const matches = /^#(\d+)_\s+(.+)$/.exec(text);
  if (matches) {
    const [id, content] = matches.slice(1);
    const regex = /#(\d+)_/g;
    const idx = content.search(regex);
    const title = idx >= 0 ? content.slice(0, idx).trim() : content;
    const {body, times} = parseTextToTimes(title);
    const ret = parseTextToLabels(body);
    return {
      id,
      title: ret.body,
      times,
      labels: ret.labels,
      dependIds: (content.match(regex) || []).map(i => i.match(/\d+/)[0])
    };
  }
  return {
    id: null,
    title: text,
    times: null,
    labels: [],
    dependIds: []
  };
}


/**
 * Parse Item to Story
 *
 * @param {Object} item item
 * @return {Array} current story and descendants stories
 */
function parseOpmlItem(item) {
  const parsedItem = parseTextToStory(item.text);
  if (!parsedItem.id && isStory(item.text)) {
    throw new ParseError({
      type: 'item',
      message: 'invalid',
      text: item.text
    });
  }
  const children = item.children || [];
  let descendants = [];
  let descriptions = [];
  children.forEach(child => {
    const [parsedChild, ds] = parseOpmlItem(child);
    if (parsedChild.id) {
      parsedChild.parentId = parsedItem.id;
      descendants = descendants.concat([parsedChild]).concat(ds);
    } else {
      descriptions = descriptions.concat(
        [`- ${parsedChild.title}`]
      ).concat(
        parsedChild.description.split('\n').filter(d => d).map(d => `  ${d}`)
      );
    }
  });
  const ret = Object.assign({}, parsedItem, {
    description: descriptions.join('\n')
  });
  return [ret, descendants];
}


/**
 * opmlToStories
 *
 * @param {Object} opmlJSON opml object
 * @return {Promise<Object[], ParseError[]>}
 */
export function opmlToStories(opmlJSON) {
  const errors = [];
  const stories = opmlJSON.children.reduce((results, item) => {
    try {
      const [parsed, ds] = parseOpmlItem(item);
      return results.concat([parsed]).concat(ds);
    } catch (e) {
      if (e.type) {
        errors.push(e);
      } else {
        throw e;
      }
    }
    return results;
  }, []);
  if (errors.length) {
    return Promise.reject(errors);
  }
  return Promise.resolve(stories);
}


/**
 * Stories To Cards
 *
 * @param {Object[]} stories stories
 * @param {Object} config config
 * @return {Promise<Object[], ParseError[]>}
 */
export function storiesToCards(stories, config) {
  const errors = [];
  const cards = stories.map(story => {
    let labels = story.parentId ? [] : [config.labels.issue];
    labels = labels.concat(story.labels.map(l => config.labelAliases[l]));
    return {
      name: createCardName(story),
      desc: story.description,
      labels: labels.concat(config.labels.open)
    };
  });
  if (errors.length) {
    return Promise.reject(errors, cards);
  }
  return Promise.resolve(cards);
}


/**
 * fetch Board data from Trello
 *
 * @param {Object} trello Trello instance
 * @param {string} boardId Trello board ID
 * @return {Promise<Object, Error>}
 */
function fetchBoardInfo(trello, boardId) {
  return new Promise((resolve, reject) => {
    trello.get(`/1/boards/${boardId}`, {
      labels: 'all',
      lists: 'open'
    }, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
}


/**
 * Post Card to Trello
 *
 * @param {Object} trello Trello instance
 * @param {Object} card card
 * @return {Promise<Object, Error>}
 */
function postCard(trello, card) {
  return new Promise((resolve, reject) => {
    trello.post(`/1/cards`, card, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
}


/**
 * Register cards to Trello
 *
 * @param {Object[]} cards card list
 * @param {Object} config config
 * @param {boolean} dryRun flag
 * @return {Promise<Object, Error>}
 */
export function sendTrello(cards, config, dryRun) {
  const trello = new Trello(config.apiKey, config.apiToken);
  const promise = fetchBoardInfo(trello, config.boardId).then(board => {
    const labelMap = board.labels.reduce((m, l) => {
      if (!l.name) {
        return m;
      }
      return Object.assign({}, m, {[l.name]: l.id});
    }, {});
    const inboxList = board.lists.find(l => l.name === config.inboxListName);
    return cards.map(c => {
      const idLabels = c.labels.map(l => labelMap[l]);
      if (idLabels.indexOf(undefined) >= 0) {
        throw new Error(`Label id not found: ${c.labels}`);
      }
      return Object.assign({}, c, {
        due: null,
        urlSource: null,
        idLabels: idLabels.join(','),
        idList: inboxList.id,
        labels: undefined
      });
    });
  });
  if (dryRun) {
    return promise.then(validCards => {
      return {
        validCards,
        responses: []
      };
    });
  }
  return promise.then(validCards => {
    const results = [];
    let pr = Promise.resolve();
    validCards.forEach(c => {
      pr = pr.then(res => {
        results.push(res);
        return postCard(trello, c);
      });
    });
    return pr.then(() => {
      return {
        validCards,
        responses: results
      };
    });
  });
}
