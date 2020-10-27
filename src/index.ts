import NGWord from './ng-words';
import loadConfig from './config';
import main from './main';
import { Bot } from './bot';

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
