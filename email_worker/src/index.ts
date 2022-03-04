import { Channel, connect, Connection } from "amqplib";
import { MAILGUN_TOKEN, MAIL_DOMAIN, RABBIT_DSN } from "./settings";

import mailgun from "mailgun-js";

(async () => {
    if(!MAILGUN_TOKEN || !MAIL_DOMAIN) {
        console.error('MAILGUN_TOKEN or MAIL_DOMAIN is not set');
        return;
    }
    const mg = mailgun({ apiKey: MAILGUN_TOKEN, domain: MAIL_DOMAIN });

    let connection: Connection = await connect(RABBIT_DSN);
    let channel: Channel = await connection.createChannel();

    channel.assertQueue('user.password.reset');
    channel.prefetch(1);
    channel.consume('user.password.reset', async msg => {
        if (!msg) return;
        const json = msg.content.toString() || '';
        const { name, email, link } = JSON.parse(json);
        const body = {
            to: `${name} <${email}>`,
            from: 'mckatoo@gmail.com',
            subject: 'Recuperacao de senha',
            html: `<p>Olá... acesse o link abaixo para resetar a sua senha</p>
                   <p><a href='${link}'>${link}</a></p>`,
        }
        try {
            mg.messages().send(body);
            channel.ack(msg);
        } catch (err: any) {
            console.log(err.response.body);
            channel.nack(msg);
        }
    }, {
        noAck: false
    });
})();