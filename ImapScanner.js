import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { parse } from "node-html-parser";

export class ScanningInstance {
  constructor({
    DISCORD_WEBHOOK,
    MAIL_AUTH,
    MAIL_HOST,
    MAIL_PORT,
    MAX_SCAN_LAST_EMAILS,
    MAIL_SCANNING_FOLDER,
    SEARCH_OPTIONS,
  }) {
    this.config = {
      DISCORD_WEBHOOK,
      MAIL_AUTH,
      MAIL_HOST,
      MAIL_PORT,
      MAX_SCAN_LAST_EMAILS,
      MAIL_SCANNING_FOLDER,
      SEARCH_OPTIONS,
    };

    //Imap space
    this.connection = null;
    this.client = null;
  }

  async init() {
    await this.createConnection();
    await this.selectMailBoxLock();

    const mails = await this.getLastEmailsIds();
    const mailsWithContent = await this.getEmailContent(mails);
    const parsedEmailsData = await this.getEmailsData(mailsWithContent);

    return parsedEmailsData;
  }

  async getEmailsData(mails) {
    const data = [];

    //add only clear important informations.
    for (const mail of mails) {
      const insideData = mail.envelope;
      const tempData = {};
      tempData["id"] = mail?.seq;
      tempData["from"] = insideData?.from;
      tempData["to"] = insideData?.to;
      tempData["replyTo"] = insideData?.replyTo;
      tempData["date"] = insideData?.date;
      tempData["content"] = mail.parsedData?.content;
      tempData["contentHTML"] = mail.parsedData?.contentHTML;
      tempData["links"] = mail?.parsedData.links;
      tempData["attachments"] = mail?.parsedData.attachments;
      tempData["subject"] = mail.parsedData?.subject;
      data.push(tempData);
    }

    return data;
  }

  async getLastEmailsIds() {
    console.log(`Scanning last ${this.config.MAX_SCAN_LAST_EMAILS} emails.`);

    let messagesCount = null;
    try {
      const mailsCount = await this.client.status(
        this.config.MAIL_SCANNING_FOLDER,
        {
          messages: true,
        }
      );
      messagesCount = mailsCount.messages;
    } catch (e) {
      throw new Error(
        `Cannot get mails from ${this.MAIL_SCANNING_FOLDER}. ${e.responseText}`
      );
    }

    console.log(`Success retrieved ${messagesCount} emails.`);

    const messageLimit = this.config.MAX_SCAN_LAST_EMAILS;
    let startPosition = 1;
    let endPosition = messageLimit;

    if (messagesCount > messageLimit) {
      //If email count is not enough to select ranage.
      startPosition = messagesCount - messageLimit;
      endPosition = messagesCount;
    }

    console.log(`Looking for emails matching the filters.`);
    const mails = await this.getMailsFromRange(startPosition, endPosition);
    console.info(`Found ${mails.length} matched emails.`);

    return mails;
  }

  async getEmailContent(mails) {
    for (let mail of mails) {
      let message = null;
      try {
        message = await this.client.fetchOne(mail.seq, {
          source: true,
          uid: true,
        });
      } catch (e) {
        console.error(
          `Error while download email content emailID ${mail.seq}, skip. ${e}`
        );
        continue;
      }

      if (!message) {
        console.error(`Email ${mail.seq} not have content, skip.`);
      }

      let parsedEmail = await simpleParser(message.source);

      const htmlSymulation = parse(parsedEmail.html, {
        blockTextElements: {
          style: false,
        },
      });

      let data = {
        subject: parsedEmail.subject,
        contentHTML: parsedEmail.html,
        content: "",
        attachments: parsedEmail.attachments,
      };

      let tempContent = htmlSymulation.innerText;
      data["content"] = tempContent
        .replaceAll("\t", "")
        .replaceAll("\n", "")
        .replaceAll("  ", "")
        .replace("<!doctype html>", "")
        .trim();

      data["links"] = this.getAllLinksFromHtml(data.content);
      mail["parsedData"] = data;
    }
    return mails;
  }

  getAllLinksFromHtml(content) {
    const urlRegex =
      /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
    let matchs = content.match(urlRegex);
    return matchs;
  }

  async getMailsFromRange(min, max) {
    const mails = [];

    //get emails length to calculate max range.
    const totalMessages = await this.client
      .status(this.config.MAIL_SCANNING_FOLDER, {
        messages: true,
      })
      .catch((e) => {
        throw new Error(
          `Cannot get mails from ${this.MAIL_SCANNING_FOLDER}. ${e.responseText}`
        );
      });

    if (totalMessages.messages === 0) return [];

    try {
      for await (let message of this.client.fetch(
        `1:${totalMessages?.messages || 1}`,
        {
          envelope: true,
          maxLength: this.config.MAX_SCAN_LAST_EMAILS,
          uid: true,
        }
      )) {
        const emailTitle = message?.envelope?.subject;
        if (!emailTitle) throw new Error("Cannot find email title.");

        if (this.config.SEARCH_OPTIONS.title) {
          if (this.config.SEARCH_OPTIONS.title === "*") {
            mails.push(message);
            continue;
          }

          const lowerTitle = emailTitle.toLocaleLowerCase();
          const lowerFindTitle =
            this.config.SEARCH_OPTIONS.title.toLocaleLowerCase();

          if (lowerTitle.indcludes(lowerFindTitle)) {
            mails.push(message);
          }
        }
      }
    } catch (e) {
      //Skip only one email without throwing error.
      console.error(`Error while download email. ${e}`);
    }

    await this.lock.release();
    return mails;
  }

  async selectMailBoxLock() {
    const folder = this.config.MAIL_SCANNING_FOLDER;
    console.log(`Select ${folder} space in webmail.`);

    try {
      this.lock = await this.client.getMailboxLock(folder);
    } catch (e) {
      throw new Error(
        `Cannot get space "${folder}" from IMAP server. ${e.responseText}.`
      );
    }
    console.info(`Successed select "${folder}" space.`);
  }

  async createConnection() {
    console.log(`Login to IMAP webmail server.`);

    this.client = new ImapFlow({
      auth: this.config.MAIL_AUTH,
      host: this.config.MAIL_HOST,
      port: this.config.MAIL_PORT,
      logger: false,
      secure: true,
    });

    try {
      this.connection = await this.client.connect();
    } catch (e) {
      throw new Error(
        `Cannot connected to IMAP server, check your login and host data. ${e.responseText}`
      );
    }

    console.info(`Successed logged to IMAP server ${this.config.MAIL_HOST}.`);
  }
}
