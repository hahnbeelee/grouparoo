import { AuthenticatedAction } from "../classes/actions/authenticatedAction";
import { AppRefreshQuery } from "../models/AppRefreshQuery";
import { Run } from "../models/Run";
import { ConfigWriter } from "../modules/configWriter";

export class AppRefreshQueryRun extends AuthenticatedAction {
  constructor() {
    super();
    this.name = "appRefreshQuery:run";
    this.description =
      "run an appRefreshQuery to check for new data and enqueue schedules if needed";
    this.outputExample = {};
    this.permission = { topic: "app", mode: "write" };
    this.inputs = { id: { required: true } };
  }
  async runWithinTransaction({ params }) {
    let valueUpdated: Boolean = false;
    const appRefreshQuery = await AppRefreshQuery.findById(params.id);
    if (!appRefreshQuery)
      throw new Error(`No app refresh query ${params.id} found`);

    const sampleValue = await appRefreshQuery.query();
    await appRefreshQuery.update({ lastConfirmedAt: new Date() });

    let runs: Run[] = [];

    if (sampleValue !== appRefreshQuery.value) {
      await appRefreshQuery.update({
        value: sampleValue,
        lastChangedAt: new Date(),
      });

      runs = await appRefreshQuery.triggerSchedules(true);
      valueUpdated = true;
    }

    return {
      valueUpdated,
      appRefreshQuery: await appRefreshQuery.apiData(),
      runs,
    };
  }
}

export class AppRefreshQueryCreate extends AuthenticatedAction {
  constructor() {
    super();
    this.name = "appRefreshQuery:create";
    this.description = "create an app refresh query";
    this.outputExample = {};
    this.permission = { topic: "app", mode: "write" };
    this.inputs = {
      appId: { required: true },
      refreshQuery: { required: false },
      recurringFrequency: { required: false },
      state: { required: false },
    };
  }

  async runWithinTransaction({ params }) {
    const appRefreshQuery = await AppRefreshQuery.create({
      appId: params.appId,
    });
    if (params.refreshQuery)
      await appRefreshQuery.update({ refreshQuery: params.refreshQuery });
    if (params.recurringFrequency)
      await appRefreshQuery.update({
        recurringFrequency: params.recurringFrequency,
      });
    if (params.state) await appRefreshQuery.update({ state: params.state });

    await ConfigWriter.run();

    return { appRefreshQuery: await appRefreshQuery.apiData() };
  }
}

export class AppRefreshQueryEdit extends AuthenticatedAction {
  constructor() {
    super();
    this.name = "appRefreshQuery:edit";
    this.description = "edit an app query refresh";
    this.outputExample = {};
    this.permission = { topic: "app", mode: "write" };
    this.inputs = {
      id: { required: true },
      appId: { required: false },
      refreshQuery: { required: false },
      recurringFrequency: { required: false },
      state: { required: false },
    };
  }
  async runWithinTransaction({ params }) {
    const appRefreshQuery = await AppRefreshQuery.findById(params.id);
    await appRefreshQuery.update(params);

    const sampleValue = await appRefreshQuery.query();
    await appRefreshQuery.update({ lastConfirmedAt: new Date() });

    if (sampleValue !== appRefreshQuery.value) {
      await appRefreshQuery.update({
        value: sampleValue,
        lastChangedAt: new Date(),
      });
      await appRefreshQuery.triggerSchedules(true);
    }

    await ConfigWriter.run();

    return { appRefreshQuery: await appRefreshQuery.apiData() };
  }
}

export class AppRefreshQueryTest extends AuthenticatedAction {
  constructor() {
    super();
    this.name = "appRefreshQuery:test";
    this.description = "test the query for a given appRefreshQuery";
    this.permission = { topic: "app", mode: "write" };
    this.outputExample = {};
    this.inputs = {
      id: { required: true },
      refreshQuery: { required: false },
    };
  }

  async runWithinTransaction({ params }) {
    const appRefreshQuery = await AppRefreshQuery.findById(params.id);

    const test = await appRefreshQuery.test(params.refreshQuery);
    if (test.error) test.error = String(test.error);

    return {
      test,
      appRefreshQuery: await appRefreshQuery.apiData(),
    };
  }
}

export class AppRefreshQueryView extends AuthenticatedAction {
  constructor() {
    super();
    this.name = "appRefreshQuery:view";
    this.description = "view an app refresh query";
    this.outputExample = {};
    this.permission = { topic: "app", mode: "read" };
    this.inputs = {
      id: { required: true },
    };
  }

  async runWithinTransaction({ params }) {
    const appRefreshQuery = await AppRefreshQuery.findById(params.id);
    return { appRefreshQuery: await appRefreshQuery.apiData() };
  }
}

export class AppRefreshQueryDestroy extends AuthenticatedAction {
  constructor() {
    super();
    this.name = "appRefreshQuery:destroy";
    this.description = "destroy an appRefreshQuery";
    this.outputExample = {};
    this.permission = { topic: "app", mode: "write" };
    this.inputs = {
      id: { required: true },
    };
  }

  async runWithinTransaction({ params }) {
    const appRefreshQuery = await AppRefreshQuery.findById(params.id);
    await appRefreshQuery.destroy();

    await ConfigWriter.run();

    return { success: true };
  }
}