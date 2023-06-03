import { Bot } from './bot.js';
import loadConfig from './config.js';
import main from './main.js';
import NGWord from './ng-words.js';

process.on('unhandledRejection', console.dir);

loadConfig()
    .then((config) => {
        const _m = new Bot(config, new NGWord());
        main(_m);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
