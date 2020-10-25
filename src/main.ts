import ReconnectingWebSocket from 'reconnecting-websocket';
import { Bot } from './bot';
import Module from './module';
import API, { Streaming } from './misskey/api';
import { isNote, Note } from './misskey/note';

import TLPizzaModule from './modules/tl-pizza';
import TLLearnModule from './modules/tl-learn';
import KawaiiModule from './modules/kawaii';
import CheckModule from './modules/check';
import SearchModule from './modules/search';
import LearnModule from './modules/learn';
import HungryModule from './modules/hungry';
import FoodModule from './modules/food';
import SushiModule from './modules/sushi';
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
    new CheckModule(),
    new SearchModule(),
    new LearnModule(),
    new HungryModule(),
    new FoodModule(),
    new SushiModule(),
    new KawaiiModule(),
    new FollowCommandModule(),
    new UnfollowCommandModule(),
    new HelpCommandModule(),
    new PingCommandModule(),
    new SayCommandModule(),
    new InfoCommandModule(),
    new DeleteCommandModule(),
    new NGWordCommandModule(),
];

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

    const wsConnectChannel = function (ws: ReconnectingWebSocket) {
        channels.forEach((channel) => {
            ws.send(
                JSON.stringify({
                    type: 'connect',
                    body: {
                        channel: channel.channel,
                        id: channel.id,
                    },
                })
            );
        });
        bot.log('Connected!');
    };

    bot.ws.addEventListener('open', function () {
        wsConnectChannel(bot.ws);
    });
    bot.ws.addEventListener('close', function () {
        bot.log('Disconnected.');
    });

    bot.ws.addEventListener('message', function (data) {
        const json = JSON.parse(data.data) as Streaming;

        if (json.body.id === 'streamingTLId') {
            if (!isNote(json.body.body)) return;
            const note = new Note(json.body.body);

            if (note.note.userId === bot.config.userId) return;
            if (note.note.text === null) return;
            if (note.note.cw !== null) return;
            if (/@oishiibot/.test(note.note.text)) return;
            if (note.note.visibility === 'specified') return;

            note.removeURLs().removeMentions();

            if (note.hasNGWord(bot.ngWords)) {
                bot.log('SKIP(NG WORD):', note.findNGWord(bot.ngWords));
                return;
            }

            if (tlModules.pizza.Regex.test(note.note.text)) {
                tlModules.pizza.Run(bot, note);
                return;
            }

            void tlModules.learn.Run(bot, note);

            // TODO: 自動投稿
        }

        if (json.body.id === 'streamingMainId') {
            // if (json.body.type === 'readAllUnreadMentions') return;
            // if (json.body.type === 'readAllUnreadSpecifiedNotes') return;
            // if (json.body.type === 'readAntenna') return;
            // if (json.body.type === 'readAllAntennas') return;
            // if (json.body.type === 'readAllNotifications') return;
            const type = json.body.type;
            const allowTypes = ['note', 'messagingMessage', 'followed'];
            if (!allowTypes.includes(type)) return;

            if (type === 'followed') {
                const done = API.api('/following/create', {
                    userId: json.body.body.id,
                }).catch((err) => console.error(err));

                const logPrefix = done ? 'Follow' : 'Failed to follow';
                bot.log(`${logPrefix} ${json.body.body.user.username} (${json.body.body.userId})`);
                return;
            }

            if (isNote(json.body.body)) {
                const note = new Note(json.body.body);
                const mod = modules.find((module) => module.Regex.test(note.note.text));
                if (mod) {
                    mod.Run(bot, note);
                }
            } else {
                // TODO: メッセージ対応
                // const msg = new Message(json.body.body);
            }
        }
    });
}
