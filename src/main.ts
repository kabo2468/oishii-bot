import { Bot } from './bot';
import Module from './module';
import { Streaming } from './misskey/api';
import { isNote, Note } from './misskey/note';
import { TextProcess } from './utils/text-process';

import TLPizzaModule from './modules/tl-pizza';
import TLLearnModule from './modules/tl-learn';
import KawaiiModule from './modules/kawaii';
import CheckModule from './modules/check';
import SearchModule from './modules/search';
import LearnModule from './modules/learn';
import HungryModule from './modules/hungry';
import FoodModule from './modules/food';
import SushiModule from './modules/sushi';
import FortuneModule from './modules/fortune';
import NullpoModule from './modules/nullpo';
import ReversiModule from './modules/reversi';
import Reversi from './modules/reversi/reversi';
import FollowCommandModule from './modules/commands/follow';
import UnfollowCommandModule from './modules/commands/unfollow';
import HelpCommandModule from './modules/commands/help';
import PingCommandModule from './modules/commands/ping';
import SayCommandModule from './modules/commands/say';
import InfoCommandModule from './modules/commands/info';
import DeleteCommandModule from './modules/commands/delete';
import NGWordCommandModule from './modules/commands/ngword';

const tlModules = {
    pizza: new TLPizzaModule(),
    learn: new TLLearnModule(),
};
// prettier-ignore
const modules: Module[] = [
    new FollowCommandModule(),
    new UnfollowCommandModule(),
    new HelpCommandModule(),
    new PingCommandModule(),
    new SayCommandModule(),
    new InfoCommandModule(),
    new DeleteCommandModule(),
    new NGWordCommandModule(),
    new CheckModule(),
    new SearchModule(),
    new LearnModule(),
    new HungryModule(),
    new FoodModule(),
    new SushiModule(),
    new KawaiiModule(),
    new FortuneModule(),
    new NullpoModule(),
    // new ReversiModule(),
];

let tlCount = 0;

export default function (bot: Bot): void {
    const channels = [
        {
            channel: 'homeTimeline',
            id: 'streamingTLId',
        },
        {
            channel: 'main',
            id: 'streamingMainId',
        },
    ];

    bot.ws.addEventListener('open', function () {
        channels.forEach((channel) => {
            bot.connectChannel(channel.channel, channel.id);
        });
        bot.log('Connected!');
    });
    bot.ws.addEventListener('close', function () {
        bot.log('Disconnected.');
    });

    bot.ws.addEventListener('message', function (data) {
        const json = JSON.parse(data.data) as Streaming;

        if (json.body.id === 'streamingTLId') {
            if (!isNote(json.body.body)) return;
            const note = new Note(bot, json.body.body);

            if (note.note.userId === bot.config.userId) return;
            if (note.note.text === null) return;
            if (note.note.cw !== null) return;
            if (/@oishiibot/.test(note.note.text)) return;
            if (note.note.visibility === 'specified') return;

            note.removeURLs().removeMentions();

            const ng = note.findNGWord(bot.ngWords);
            if (ng) {
                bot.log('SKIP(NG WORD):', ng);
                return;
            }

            if (tlModules.pizza.Regex.test(note.note.text)) {
                tlModules.pizza.Run(bot, note);
                return;
            }

            void tlModules.learn.Run(bot, note);

            tlCount++;
            if (tlCount > bot.config.followings / 3) {
                if (Math.random() < bot.config.post.tlPostProbability) {
                    bot.sayFood();
                    tlCount = 0;
                }
            }
        }

        if (json.body.id === 'streamingMainId') {
            const type = json.body.type;
            const allowTypes = ['mention', 'messagingMessage', 'followed', 'reversiInvited'];
            if (!allowTypes.includes(type)) return;

            if (!('parentId' in json.body.body) && json.body.body.user?.isBot === true) return;

            if (type === 'followed') {
                const user: {
                    id: string;
                    username: string;
                    host: string;
                } = JSON.parse(data.data).body.body;

                const done = bot.api
                    .call('following/create', {
                        userId: json.body.body.id,
                    })
                    .catch((err) => console.error(err));

                const logPrefix = done ? 'Followed' : 'Failed to follow';
                bot.log(`${logPrefix} @${user.username}${user.host ? `@${user.host}` : ''} (ID: ${user.id})`);
                return;
            }

            if (type === 'reversiInvited') {
                if (!('parentId' in json.body.body)) return;
                Reversi(bot, json.body.body.parentId);
            }

            if (isNote(json.body.body)) {
                const note = new Note(bot, json.body.body);
                note.removeURLs().removeMentionToMe();
                bot.log('Text:', new TextProcess(note.note.text).replaceNewLineToText().toString());

                const mod = modules.find((module) => module.Regex.test(note.note.text));
                if (mod) {
                    bot.log('Module:', mod.Name);
                    setTimeout(() => {
                        mod.Run(bot, note);
                    }, 1000);
                    return;
                }
                note.reaction();
            } else {
                // TODO: メッセージ対応
                // const msg = new Message(bot, json.body.body);
            }
        }
    });
}
