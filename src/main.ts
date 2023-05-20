import { Bot } from './bot.js';
import { Streaming } from './misskey/api.js';
import { isNote, Note } from './misskey/note.js';
import Module from './module.js';
import CheckModule from './modules/check.js';
import DeleteAllCommandModule from './modules/commands/delete-all.js';
import DeleteUserCommandModule from './modules/commands/delete-user.js';
import DeleteCommandModule from './modules/commands/delete.js';
import EncodeCommandModule from './modules/commands/encode.js';
import FollowCommandModule from './modules/commands/follow.js';
import GetCommandModule from './modules/commands/get.js';
import GetUserCommandModule from './modules/commands/getuser.js';
import HelpCommandModule from './modules/commands/help.js';
import InfoCommandModule from './modules/commands/info.js';
import LearnedCommandModule from './modules/commands/learned.js';
import NGWordCommandModule from './modules/commands/ngword.js';
import PingCommandModule from './modules/commands/ping.js';
import SayCommandModule from './modules/commands/say.js';
import UnfollowCommandModule from './modules/commands/unfollow.js';
import WhiteDayCommandModule from './modules/commands/white-day.js';
import FoodModule from './modules/food.js';
import FortuneModule from './modules/fortune.js';
import HungryModule from './modules/hungry.js';
import KawaiiModule from './modules/kawaii.js';
import LearnModule from './modules/learn.js';
import NullpoModule from './modules/nullpo.js';
import SearchModule from './modules/search.js';
import SushiModule from './modules/sushi.js';
import TLCallModule from './modules/tl-call.js';
import TLLearnModule from './modules/tl-learn.js';
import TLPizzaModule from './modules/tl-pizza.js';
import TLReactionModule from './modules/tl-reaction.js';
import ValentineModule from './modules/valentine.js';
import { TextProcess } from './utils/text-process.js';

const tlModules = {
    pizza: new TLPizzaModule(),
    learn: new TLLearnModule(),
    reaction: new TLReactionModule(),
    call: new TLCallModule(),
};
// prettier-ignore
const modules: Module[] = [
    new CheckModule(),
    new SearchModule(),
    new LearnModule(),
    new HungryModule(),
    new FoodModule(),
    new SushiModule(),
    new KawaiiModule(),
    new FortuneModule(),
    new NullpoModule(),
    new ValentineModule(),
    new FollowCommandModule(),
    new UnfollowCommandModule(),
    new HelpCommandModule(),
    new PingCommandModule(),
    new SayCommandModule(),
    new InfoCommandModule(),
    new DeleteCommandModule(),
    new DeleteAllCommandModule(),
    new DeleteUserCommandModule(),
    new NGWordCommandModule(),
    new EncodeCommandModule(),
    new GetCommandModule(),
    new WhiteDayCommandModule(),
    new LearnedCommandModule(),
    new GetUserCommandModule(),
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
    bot.ws.addEventListener('error', function (err) {
        bot.log('Error:', err.message);
    });

    bot.ws.addEventListener('message', function (data) {
        const json = JSON.parse(data.data) as Streaming;

        if (json.body.id === 'streamingTLId') {
            if (!isNote(json.body.body)) return;
            const note = new Note(bot, json.body.body);

            if (note.note.userId === bot.config.userId) return;
            if (!note.text) return;
            if (note.note.cw !== null) return;
            if (/@oishiibot/.test(note.text)) return;
            if (note.note.visibility === 'specified') return;
            if (note.note.replyId) return;

            note.removeURLs().removeMentions();

            const ng = note.findNGWord(bot.ngWords);
            if (ng) {
                bot.log('SKIP(NG WORD):', ng);
                return;
            }

            if (tlModules.pizza.Regex.test(note.text)) {
                tlModules.pizza.Run(bot, note);
                return;
            }
            if (tlModules.call.Regex.test(note.text)) {
                tlModules.call.Run(bot, note);
                return;
            }
            void tlModules.learn.Run(bot, note);
            void tlModules.reaction.Run(bot, note);

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
            const allowTypes = ['mention', 'messagingMessage', 'followed'];
            if (!allowTypes.includes(type)) return;

            if (!('parentId' in json.body.body) && json.body.body.user?.isBot === true) return;

            if (type === 'followed') {
                const user: {
                    id: string;
                    username: string;
                    host: string;
                } = JSON.parse(data.data).body.body;

                (async () => {
                    const done = await bot.api
                        .call('following/create', {
                            userId: json.body.body.id,
                        })
                        .then((res) => res.ok)
                        .catch((err) => console.error(err));

                    const logPrefix = done ? 'Followed' : 'Failed to follow';
                    bot.log(`${logPrefix} @${user.username}${user.host ? `@${user.host}` : ''} (ID: ${user.id})`);
                })();
                return;
            }

            if (!isNote(json.body.body)) return;
            const note = new Note(bot, json.body.body);
            note.removeURLs().removeMentionToMe();
            bot.log('Text:', new TextProcess(note.text).replaceNewLineToText().toString());

            const mod = modules.find((module) => module.Regex.test(note.text));
            if (mod) {
                bot.log('Module:', mod.Name);
                setTimeout(() => {
                    mod.Run(bot, note);
                }, 1000);
                return;
            }
            note.reaction();
        }
    });
}
