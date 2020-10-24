import NGWord from './ng-words';
import loadConfig from './config';
import main from './main';
import { Bot } from './bot';

process.on('unhandledRejection', console.dir);

loadConfig()
    .then((config) => {
        console.dir(config);
        const _m = new Bot(config, new NGWord());
        main(_m);
    })
    .catch((err) => {
        throw err;
    });
