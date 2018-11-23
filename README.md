# loopback-connector-realtime-database

Firebase Realtime Database connector for the LoopBack framework.

[![Build Status](https://dev.azure.com/henriquecarvgit/henriquecarvgit/_apis/build/status/henriquecarv.loopback-connector-realtime-database?branchName=master)](https://dev.azure.com/henriquecarvgit/henriquecarvgit/_build/latest?definitionId=4)
[![npm](https://img.shields.io/npm/dt/loopback-connector-realtime-database.svg)](https://www.npmjs.com/package/loopback-connector-realtime-database)
[![npm](https://img.shields.io/npm/v/loopback-connector-realtime-database.svg)](https://www.npmjs.com/package/loopback-connector-realtime-database)
[![LICENSE](https://img.shields.io/github/license/henriquecarv/loopback-connector-realtime-database.svg)](./LICENSE)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=henriquecarv/loopback-connector-realtime-database)](https://dependabot.com)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fhenriquecarv%2Floopback-connector-realtime-database.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fhenriquecarv%2Floopback-connector-realtime-database?ref=badge_shield)

## System Requirements

- **[NodeJS](https://nodejs.org/en/)** (version >= 10).

## Installation

If you want to know how to get started with Loopback [check this][5].

To add a new data source, use the data source generator:

```sh
lb datasource
```

Then the data source generator will prompt some questions like

- Enter the data-source name: **Firebase** _(Choose your prefered name)_
- Select the connector for Firebase: **other**
- Enter the connector's module name **loopback-connector-realtime-database**
- Install loopback-connector-realtime-database (Y/n) **y**

Then you should use a service account. Go to [Project Settings > Service Accounts][4] in the Google Cloud Platform Console. Generate a new private key and save the JSON file.

You should fill the application's datasource file which is located in `/server/datasources.json` with those details, You can find them in the downloaded JSON file from the Google Cloud Platform.

```json
"Firebase": {
  "name": "Firebase",
  "projectId": "",
  "clientEmail":  "",
  "privateKey": "",
  "databaseName": "Optional, Default: projectId"
}
```

### Connection properties

| Property     | Type&nbsp;&nbsp; | Description                   | ---                          |
| ------------ | ---------------- | ----------------------------- | ---------------------------- |
| projectId    | String           | project_id in the JSON file   | ---                          |
| clientEmail  | String           | client_email in the JSON file | ---                          |
| privateKey   | String           | private_key in the JSON file  | ---                          |
| databaseName | String           | Firebase's project id         | Optional, Default: projectId | --- |

And you can actually store those private details as an Environment variables, Check [source-configuration][6]

### Inspiration

Dyaa Eldin Moustafa [Firestore connector][3]

### License

Copylefted (c) 2018 [Henrique Carvalho da Cruz][1] Licensed under the [MIT license][2].

[1]: https://henriquecarv.com
[2]: ./LICENSE
[3]: https://github.com/dyaa/loopback-connector-firestore
[4]: https://console.cloud.google.com/projectselector/iam-admin/serviceaccounts
[5]: http://loopback.io/getting-started/
[6]: https://loopback.io/doc/en/lb3/Environment-specific-configuration.html#data-source-configuration


[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fhenriquecarv%2Floopback-connector-realtime-database.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fhenriquecarv%2Floopback-connector-realtime-database?ref=badge_large)