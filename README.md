# Simple IMAP Scanner API

This project provides a straightforward `ScanningInstance` class that simplifies interactions with an IMAP server using the powerful `imapflow` library. It offers ready-to-use functions for common email scanning tasks, such as connecting to a server, fetching recent emails, parsing their content, and extracting useful information.

## Features

* Simplifies the `imapflow` setup and common operations.
* Connects to an IMAP server with provided credentials.
* Fetches a specified number of the latest emails from a designated folder.
* Filters emails by subject.
* Parses email content (text and HTML).
* Extracts links from email bodies.
* Retrieves email attachments.
* Provides structured data for each scanned email.

## Core Class: `ScanningInstance`

The main component of this API is the `ScanningInstance` class.

### `constructor(config)`

Initializes a new instance of the scanner with your IMAP server details and scanning preferences.

**Parameters:**

* `config` (Object): Configuration object containing:
    * `DISCORD_WEBHOOK` (String): Webhook URL for Discord notifications (usage not shown in the provided snippet but likely intended for broader application).
    * `MAIL_AUTH` (Object): Authentication object for `imapflow` (e.g., `{ user, pass }`).
    * `MAIL_HOST` (String): IMAP server hostname.
    * `MAIL_PORT` (Number): IMAP server port.
    * `MAX_SCAN_LAST_EMAILS` (Number): The maximum number of recent emails to scan.
    * `MAIL_SCANNING_FOLDER` (String): The mailbox folder to scan (e.g., 'INBOX').
    * `SEARCH_OPTIONS` (Object): Options for filtering emails, e.g., `{ title: "Subject Keyword" }` or `{ title: "*" }` to match any title.

### Public Methods

Here's a breakdown of the available asynchronous methods:

* **`async init()`**
    * **Purpose:** The main entry point to start the email scanning process. It orchestrates the connection, mailbox selection, email fetching, and parsing.
    * **Returns:** `Promise<Array>` - An array of objects, where each object contains parsed data for an email.

* **`async getEmailsData(mails)`**
    * **Purpose:** Takes an array of raw email objects (as fetched by `imapflow` and processed by `getEmailContent`) and transforms them into a more structured and simplified format.
    * **Parameters:**
        * `mails` (Array): An array of email objects that have had their content parsed.
    * **Returns:** `Promise<Array>` - An array of objects, with each object containing fields like `id`, `from`, `to`, `replyTo`, `date`, `content`, `contentHTML`, `links`, `attachments`, and `subject`.

* **`async getLastEmailsIds()`**
    * **Purpose:** Fetches the sequence numbers (and other envelope data) of the most recent emails in the configured mailbox, up to `MAX_SCAN_LAST_EMAILS`. It also applies title-based filtering if specified in `SEARCH_OPTIONS`.
    * **Returns:** `Promise<Array>` - An array of email message objects (containing envelope data and sequence numbers) that match the criteria.

* **`async getEmailContent(mails)`**
    * **Purpose:** Downloads the full source of each email specified in the input array, parses it using `mailparser` and `node-html-parser` to extract the subject, HTML content, plain text content, and attachments. It also extracts all hyperlinks from the email body.
    * **Parameters:**
        * `mails` (Array): An array of email message objects (typically from `getLastEmailsIds` or `getMailsFromRange`).
    * **Returns:** `Promise<Array>` - The input array of email objects, with an added `parsedData` property on each object containing the subject, HTML content, text content, extracted links, and attachments.

* **`getAllLinksFromHtml(content)`**
    * **Purpose:** A synchronous utility method to extract all URLs (http, https, ftp, file) from a given string of text content.
    * **Parameters:**
        * `content` (String): The text content to scan for links.
    * **Returns:** `Array|null` - An array of found URL strings, or `null` if no URLs are found.

* **`async getMailsFromRange(min, max)`**
    * **Purpose:** Fetches emails within a specific sequence number range from the configured mailbox. It retrieves envelope data and applies title-based filtering based on `SEARCH_OPTIONS`.
    * **Note:** This method also releases the mailbox lock after fetching.
    * **Parameters:**
        * `min` (Number): The starting sequence number (or UID, depending on context, but the code uses sequence numbers here).
        * `max` (Number): The ending sequence number.
    * **Returns:** `Promise<Array>` - An array of email message objects that match the criteria within the specified range.

* **`async selectMailBoxLock()`**
    * **Purpose:** Selects the mailbox folder specified in `MAIL_SCANNING_FOLDER` and acquires a lock on it. This is necessary before fetching messages or performing other operations on the mailbox.
    * **Throws:** Error if the mailbox cannot be selected or locked.

* **`async createConnection()`**
    * **Purpose:** Establishes and authenticates a connection to the IMAP server using the configuration provided in the constructor.
    * **Throws:** Error if the connection or login fails.

## Dependencies

* [imapflow](https://www.npmjs.com/package/imapflow)
* [mailparser](https://www.npmjs.com/package/mailparser)
* [node-html-parser](https://www.npmjs.com/package/node-html-parser)
