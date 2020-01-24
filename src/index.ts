// Written by Vadim Usinov
import * as Koa from 'koa';
import * as logger from 'koa-logger';
import * as Router from 'koa-router';
import * as Body from 'koa-body';
import * as noCache from 'koa-no-cache';
import * as maria from 'mariadb';
import { AddressInfo } from 'net';
import { Configuration } from './Configuration';

function createDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 4, 0);
}

function dateOut(date: Date): string {
  return date.toISOString().split('T')[0];
}

function date(year: number, month: number, day: number): string {
  return dateOut(createDate(year, month, day));
}

async function main() {
  const app = new Koa();
  const router = new Router();
  const config = new Configuration('127.0.0.1', 'root', 'bitnami_redmineplusagile', 3030, 'I7KVo7Q9v5Vg');
  console.log(config)
  let pool;
  if (config.getDbPassword()) {
    pool = maria.createPool({
      user: config.getDbUser(),
      host: config.getDbHost(),
      password: config.getDbPassword(),
      database: config.getDb(),
    });
  } else {
    pool = maria.createPool({
      user: config.getDbUser(),
      host: config.getDbHost(),
      database: config.getDb(),
    });
  }


  async function execQuery(query: string): Promise<any> {
    let connection;
    let result;
    try {
      connection = await pool.getConnection();
      result = connection.query(query);
    } catch (err) {
      console.log(err);
    } finally {
      if (connection) connection.end();
      return result;
    }
  }

  app.use(Body());

  router.get('/', (ctx) => {
    ctx.body = 'ZK Redmine Api Service'
  })

  // Get spent hours by project
  router.post('/', async (ctx) => {
    const body = ctx.request.body;
    let query = '';
    /*
            Query:
 
            SELECT SUM(time_entries.hours) as hours FROM time_entries
                    WHERE issue_id IN
                (SELECT id FROM issues as i
                    WHERE project_id =
                    (SELECT id FROM projects WHERE identifier = '${project}')
                    and tracker_id = 7
                    AND 
                    (EXISTS
                        (SELECT value FROM custom_values WHERE i.id = customized_id
                        AND value >= '4' AND custom_field_id = 7)
                    OR
                        (SELECT value FROM custom_values WHERE i.id = customized_id 
                        AND custom_field_id = 45) = 1
                    )
                    AND spent_on
                    BETWEEN STR_TO_DATE('${month}','%Y-%m-%d') AND CURDATE() 
                    AND (activity_id = 33 OR activity_id = 37);
                    
 
            Для быстрой работы необходим добавить индекс к таблице custom_values
            по трем полям: custom_field_id, customized_id, value (1)
 
            CREATE INDEX index_value_ids ON custom_values(custom_field_id, customized_id,value(1));
            Без него запрос может выполняться более 5 секунд
        */
    // console.log(body);
    const CANCEL_STATUS = 6;
    const DOUBLE_STATUS = 18;

    if (body.month) {
      query =
        // 'SELECT SUM(time_entries.hours) as hours FROM time_entries WHERE issue_id IN ' +
        // `(SELECT id FROM issues as i WHERE project_id = (SELECT id FROM projects WHERE identifier = '${body.project}') AND tracker_id = 7 ` +
        // 'AND (EXISTS (SELECT value FROM custom_values WHERE i.id = customized_id ' +
        // `AND (value = '4' OR value = '5') AND custom_field_id = 7) ` +
        // 'OR  (SELECT value FROM custom_values WHERE i.id = customized_id AND custom_field_id = 45) = 1)) ' +
        // `AND spent_on BETWEEN STR_TO_DATE('${body.month}','%Y-%m-%d') AND CURDATE() ` +
        // 'AND (activity_id = 33 OR activity_id = 37);'

        'SELECT SUM(time_entries.hours) as hours FROM time_entries WHERE issue_id IN ' +
        `(SELECT id FROM issues as i WHERE project_id = (SELECT id FROM projects WHERE identifier = '${body.project}') AND tracker_id = 7 AND NOT (status_id = 6 OR status_id = 18)) ` +
        `AND spent_on BETWEEN STR_TO_DATE('${body.month}','%Y-%m-%d') AND CURDATE() ` +
        'AND (activity_id = 33 OR activity_id = 37);'
    }
    else {
      query =
        'SELECT SUM(time_entries.hours) as hours FROM time_entries WHERE issue_id IN ' +
        `(SELECT id FROM issues WHERE project_id = (SELECT id FROM projects WHERE identifier = '${body.project}'));`;
    }
    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  });

  router.post('/1c', async (ctx) => {
    const body = ctx.request.body;
    /*
      SELECT SUM(time_entries.hours) as hours FROM time_entries
                    WHERE issue_id IN
                (SELECT id FROM issues as i
                    WHERE project_id =
                    (SELECT id FROM projects WHERE identifier = 'marrakesh-sup-4-211')
                    AND tracker_id = 7
                    AND status_id = 5
                    AND 
                    (EXISTS
                        (SELECT value FROM custom_values WHERE i.id = customized_id
                        AND value >= '4' AND custom_field_id = 7)
                    OR
                        (SELECT value FROM custom_values WHERE i.id = customized_id 
                        AND custom_field_id = 45) = 1
                    )
                    AND spent_on
                    BETWEEN STR_TO_DATE('2019-10-01','%Y-%m-%d') AND CURDATE() 
                    AND activity_id = 40;
    */
   console.log(body);
    const query = 
    // 'SELECT SUM(time_entries.hours) as hours FROM time_entries ' +
    //     'WHERE issue_id IN ' +
    // '(SELECT id FROM issues as i ' +
    //     'WHERE project_id = ' +
    //     `(SELECT id FROM projects WHERE identifier = '${body.project}') ` +
    //     'AND tracker_id = 7 ' +
    //     'AND status_id = 5 ' +
    //     'AND (EXISTS (SELECT value FROM custom_values WHERE i.id = customized_id ' +
    //       `AND (value = '4' OR value = '5') AND custom_field_id = 7) ` +
    //     'OR (SELECT value FROM custom_values WHERE i.id = customized_id AND custom_field_id = 45) = 1)) ' +
    //     `AND spent_on BETWEEN STR_TO_DATE('${body.month}','%Y-%m-%d') AND CURDATE() ` +
    //     'AND activity_id = 40; '

    'SELECT SUM(time_entries.hours) as hours FROM time_entries WHERE issue_id IN ' +
    `(SELECT id FROM issues as i WHERE project_id = (SELECT id FROM projects WHERE identifier = '${body.project}') AND tracker_id = 7 AND NOT (status_id = 6 OR status_id = 18)) ` +
    `AND spent_on BETWEEN STR_TO_DATE('${body.month}','%Y-%m-%d') AND CURDATE() ` +
    'AND activity_id = 40;'
    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  })

  // Get user id by first and last names
  router.get('/users', async (ctx) => {
    const { firstname, lastname, mail } = ctx.request.query;
    let query;
    // TODO: phone and email in filter
    if (firstname && lastname) {
      if (mail) {
        query = `SELECT users.id FROM users INNER JOIN email_addresses ON users.id = email_addresses.user_id WHERE firstname = '${firstname}' AND lastname = '${lastname}' AND address = '${mail}';`;
      }
      else
        query = `SELECT id FROM users WHERE firstname = '${firstname}' AND lastname = '${lastname}';`;
    }
    else {
      query = `SELECT id, firstname, lastname FROM users WHERE login IS NOT NULL AND login <> 'admin'`;
    }
    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  });

  router.get('/users/:id/issues', async (ctx) => {
    const user = ctx.params.id;
    let query;
    //
    query = `SELECT issues.id, subject FROM custom_values INNER JOIN issues ON issues.id = custom_values.customized_id WHERE custom_field_id = 5 AND value = ${user} ORDER BY id DESC;`;
    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  });

  // Get projects by user id
  router.get('/users/:id/projects', async (ctx) => {
    const user = ctx.params.id;
    let query;
    /*
            SELECT project_id, identifier, name FROM members INNER JOIN projects ON members.project_id = projects.id WHERE user_id = ;
 
        */
    query = `SELECT project_id, identifier, name FROM members INNER JOIN projects ON members.project_id = projects.id WHERE user_id = ${user} AND status <> 5`;
    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  });

  router.get('/issues/:id/notes', async (ctx) => {
    const issue = ctx.params.id;
    const query = `select notes, firstname, lastname, journals.created_on from journals inner join users on users.id = journals.user_id where journalized_id = ${issue} AND notes <> '';`;
    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  });

  router.get('/projects', async (ctx) => {
    const query = 'SELECT id, name FROM projects WHERE status = 1 ORDER BY name ASC;';
    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  });


  router.get('/projects/:id/issues', async (ctx) => {
    const id = ctx.params.id;
    const { applicant, order } = ctx.request.query;
    if (order && !(order !== 'asc') == !(order !== 'desc'))
      return (ctx.status = 400);
    const queryArray = [];
    queryArray.push('SELECT issues.id, subject FROM issues');
    if (applicant)
      queryArray.push(`INNER JOIN custom_values ON issues.id = custom_values.customized_id WHERE custom_field_id = 5 AND value = ${applicant} AND`);
    else
      queryArray.push('WHERE');
    queryArray.push(`project_id = ${id}`);
    if (order) {
      queryArray.push(`ORDER BY issues.id ${order}`);
    }
    else
      queryArray.push(`ORDER BY issues.id DESC`);
    queryArray.push(';');
    let query = '';
    for (const q of queryArray) {
      query += q;
      query += ' ';
    }
    // SELECT issues.id, subject FROM custom_values INNER JOIN issues ON issues.id = custom_values.customized_id WHERE custom_field_id = 5 AND value = ${user} project_id = ${id} ORDER BY id DESC;
    // query = `SELECT id, subject FROM issues where project_id = ${id} ORDER BY id DESC`;
    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  });

  router.get('/projects/:id/trackers', async (ctx) => {
    const project = ctx.params.id;
    let query;
    /*
            select project_id, tracker_id, name from projects_trackers inner join trackers on tracker_id = id where project_id = ;
 
        */
    query = `select project_id, tracker_id, name from projects_trackers inner join trackers on tracker_id = id where project_id = ${project}`;
    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  });
  router.get('/tariffs', async (ctx) => {
    const query = "select id, name, possible_values from custom_fields where name like 'Тариф%';";
    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  });
  router.get('/solutions', async (ctx) => {
    /*
        SELECT
        issues.id,
        issues.subject,
        journal_details.value,
        MAX(journals.created_on) as upd,
        firstname,
        lastname
        FROM issues
        INNER JOIN journals
        ON journals.journalized_id = issues.id
        INNER JOIN journal_details
        ON journal_details.journal_id = journals.id
        INNER JOIN custom_values
        ON
            custom_values.customized_id = issues.id
            AND
            custom_values.custom_field_id = 5
        LEFT JOIN users
        ON custom_values.value = users.id
        WHERE
        issues.tracker_id = 7
        AND
        journal_details.prop_key = 'done_ratio'
        AND
        journal_details.value = (
                SELECT default_done_ratio FROM issue_statuses
                WHERE issue_statuses.id = issues.status_id
                    AND
                    default_done_ratio BETWEEN 79 AND 99
                )
    
        GROUP BY id
        ORDER BY upd DESC;
    */
    const query = "SELECT   " +
      "  issues.id,   " +
      "  issues.subject,   " +
      "  journal_details.value,   " +
      "  MAX(journals.created_on) as upd,  " +
      "  concat(firstname, ' ', lastname) as applicant " +
      "FROM issues  " +
      "INNER JOIN journals  " +
      "  ON journals.journalized_id = issues.id  " +
      "INNER JOIN journal_details  " +
      "  ON journal_details.journal_id = journals.id  " +
      "INNER JOIN custom_values  " +
      "  ON   " +
      "    custom_values.customized_id = issues.id  " +
      "    AND  " +
      "    custom_values.custom_field_id = 5  " +
      "LEFT JOIN users  " +
      "  ON custom_values.value = users.id  " +
      "WHERE   " +
      "  issues.tracker_id = 7  " +
      "  AND  " +
      "  journal_details.prop_key = 'done_ratio'  " +
      "  AND  " +
      "  journal_details.value = (  " +
      "          SELECT default_done_ratio FROM issue_statuses  " +
      "          WHERE issue_statuses.id = issues.status_id  " +
      "            AND  " +
      "            default_done_ratio BETWEEN 79 AND 99  " +
      "        )  " +
      "  " +
      "GROUP BY id  " +
      "ORDER BY upd DESC;";
    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  });

  router.get('/companies', async (ctx) => {
    const query = 'select id, name, possible_values from custom_fields where id = 13;';
    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  });

  router.get('/labourByDay', async (ctx) => {
    const { project, month, year } = ctx.query;
    const firstMonthDay = date(year, month, 1);
    const lastMonthDay = date(year, +month + 1, 0);

    const query = 'SELECT spent_on as date, issue_id as issue, SUM(time_entries.hours) as hours FROM time_entries WHERE issue_id IN ' +
    `(SELECT id FROM issues as i WHERE project_id = (SELECT id FROM projects WHERE identifier = '${project}') AND tracker_id = 7 AND NOT (status_id = 6 OR status_id = 18)) ` +
    `AND spent_on BETWEEN STR_TO_DATE('${firstMonthDay}','%Y-%m-%d') AND STR_TO_DATE('${lastMonthDay}','%Y-%m-%d') ` +
    'AND (activity_id = 33 OR activity_id = 37) GROUP BY spent_on, issue_id;'


    const result = await execQuery(query);
    if (result) {
      const data = [];
      result.forEach(res => {
        if (!data[res.date.getDate()]) 
          data[res.date.getDate()] = { hours: 0, issues: [] };
        
        const curDate = data[res.date.getDate()];
        curDate.hours += res.hours;
        curDate.issues.push(res.issue);
      })
      ctx.body = data;
    }
    else
      ctx.status = 500;
  });

  router.get('/labour1cByDay', async (ctx) => {
    const { project, month, year } = ctx.query;
    const firstMonthDay = date(year, month, 1);
    const lastMonthDay = date(year, +month + 1, 0);

    const query = 'SELECT spent_on as date, issue_id as issue, SUM(time_entries.hours) as hours FROM time_entries WHERE issue_id IN ' +
    `(SELECT id FROM issues as i WHERE project_id = (SELECT id FROM projects WHERE identifier = '${project}') AND tracker_id = 7 AND NOT (status_id = 6 OR status_id = 18)) ` +
    `AND spent_on BETWEEN STR_TO_DATE('${firstMonthDay}','%Y-%m-%d') AND STR_TO_DATE('${lastMonthDay}','%Y-%m-%d') ` +
    'AND activity_id = 40 GROUP BY spent_on, issue_id;'

    const result = await execQuery(query);
    if (result) {
      const data = [];
      result.forEach(res => {
        if (!data[res.date.getDate()]) 
          data[res.date.getDate()] = { hours: 0, issues: [] };
        
        const curDate = data[res.date.getDate()];
        curDate.hours += res.hours;
        curDate.issues.push(res.issue);
      })
      ctx.body = data;
    }
    else
      ctx.status = 500;
  });

  router.get('/labourByUser', async (ctx) => {
    const { project, month, year } = ctx.query;
    const firstMonthDay = date(year, month, 1);
    const lastMonthDay = date(year, +month + 1, 0);

    const query = 'SELECT users.login as user, SUM(time_entries.hours) as hours FROM time_entries INNER JOIN users ON users.id = user_id WHERE issue_id IN ' +
    `(SELECT id FROM issues as i WHERE project_id = (SELECT id FROM projects WHERE identifier = '${project}') AND tracker_id = 7 AND NOT (status_id = 6 OR status_id = 18)) ` +
    `AND spent_on BETWEEN STR_TO_DATE('${firstMonthDay}','%Y-%m-%d') AND STR_TO_DATE('${lastMonthDay}','%Y-%m-%d') ` +
    'AND (activity_id = 33 OR activity_id = 37) GROUP BY user_id;'

    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  });

  router.get('/labour1cByUser', async (ctx) => {
    const { project, month, year } = ctx.query;
    const firstMonthDay = date(year, month, 1);
    const lastMonthDay = date(year, +month + 1, 0);

    const query = 'SELECT users.login as user, SUM(time_entries.hours) as hours FROM time_entries INNER JOIN users ON users.id = user_id WHERE issue_id IN ' +
    `(SELECT id FROM issues as i WHERE project_id = (SELECT id FROM projects WHERE identifier = '${project}') AND tracker_id = 7 AND NOT (status_id = 6 OR status_id = 18)) ` +
    `AND spent_on BETWEEN STR_TO_DATE('${firstMonthDay}','%Y-%m-%d') AND STR_TO_DATE('${lastMonthDay}','%Y-%m-%d') ` +
    'AND activity_id = 40 GROUP BY user_id;'

    const result = await execQuery(query);
    if (result)
      ctx.body = result;
    else
      ctx.status = 500;
  });

  router.get('/oldlabourByDayUser', async (ctx) => {
    const { project, month, year } = ctx.query;
    const firstMonthDay = date(year, month, 1);
    const lastMonthDay = date(year, +month + 1, 0);

    const query = 'SELECT spent_on as date, users.login AS user, SUM(time_entries.hours) as hours FROM time_entries INNER JOIN users ON users.id = user_id WHERE ' +
    `spent_on BETWEEN STR_TO_DATE('${firstMonthDay}','%Y-%m-%d') AND STR_TO_DATE('${lastMonthDay}','%Y-%m-%d') ` +
    'GROUP BY spent_on, login;'

    let result: any[] = await execQuery(query);
    const users = new Set<string>();
    if (result) {
      const labours: {
        user: string,
        labours: { date: string, hours: number }[],
      }[] = [];
      result.forEach((value) => {
        if (users.has(value.user)) return;
        else {
          users.add(value.user);
          const data = { user: value.user, labours: [] };
          const userLabours = result.filter(r => r.user === value.user);
          userLabours.forEach(l => {
            data.labours.push({
              date: l.date,
              hours: l.hours,
            });
          });

          labours.push(data);
        }
      })

      ctx.body = labours;
    }
    else
      ctx.status = 500;
  });

  router.get('/labourByDayUser', async (ctx) => {
    const { project, month, year } = ctx.query;
    const firstMonthDay = date(year, month, 1);
    const lastMonthDay = date(year, +month + 1, 0);

    const query = 'SELECT spent_on as date, users.login AS user, issue_id as issue, SUM(time_entries.hours) as hours FROM time_entries INNER JOIN users ON users.id = user_id WHERE ' +
    `spent_on BETWEEN STR_TO_DATE('${firstMonthDay}','%Y-%m-%d') AND STR_TO_DATE('${lastMonthDay}','%Y-%m-%d') ` +
    'GROUP BY spent_on, login, issue_id;'

    let result: any[] = await execQuery(query);
    const users = new Set<string>();
    if (result) {
      const labours: {
        user: string,
        labours: any,
      }[] = [];
      result.forEach((value) => {
        if (users.has(value.user)) return;
        else {
          users.add(value.user);
          const data = { user: value.user, labours: {} };
          const userLabours = result.filter(r => r.user === value.user);

          userLabours.forEach(labour => {
            if (!data.labours[labour.date.getDate()]) 
              data.labours[labour.date.getDate()] = { hours: 0, issues: [] };

            const currentDateLabour = data.labours[labour.date.getDate()];
            currentDateLabour.hours += labour.hours;
            currentDateLabour.issues.push(labour.issue);
          });

          labours.push(data);
        }
      })

      ctx.body = labours;
    }
    else
      ctx.status = 500;
  });

  app.use(noCache({
    global: true
  }));

  app.use(router.routes());
  app.use(router.allowedMethods());

  // START APP
  const http = app.listen(config.getPort());

  console.log(
    `Application started on port: ${(<AddressInfo>http.address()).port}`,
  );

  process.on('SIGINT', () => process.exit(0));
  return app;
}

main();

