import {
  createQueryBuilder,
  deferredJoinPagination,
  execute,
  patchEntity,
  removeEntity,
  saveEntity,
} from '@extensions/postgresql';
import {
  feature,
  field,
  mandatory,
  project,
  table,
  trigger,
  useTable,
  workflow,
} from '@january/declarative';
import { tables } from '@workspace/entities';
import z from 'zod';
export default project(
  feature('Tasks', {
    workflows: [
      //#region Tasks
      workflow('GetAllListsTasksAndSubtasks', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'get',
          path: '/',
        }),
        execute: async ({ trigger }) => {
          const qb = createQueryBuilder(tables.lists, 'lists')
            .leftJoinAndSelect('list.tasks', 'task')
            .leftJoinAndSelect('list.parentTask', 'parentTask')
            .leftJoinAndSelect('list.lists', 'subList')
            .leftJoinAndSelect('subList.tasks', 'subTask')
            .where('list.parentTask IS NULL');

          const paginationMetadata = deferredJoinPagination(qb, {
            pageSize: trigger.query.pageSize,
            pageNo: trigger.query.pageNo,
            count: await qb.getCount(),
          });
          const records = await execute(qb);
          return {
            meta: paginationMetadata(records),
            records: records,
          };
        },
      }),
      workflow('CreateTaskWorkflow', {
        tag: 'lists',
        trigger: trigger.http({
          method: 'post',
          path: '/:listId/tasks',
          input: (trigger) => ({
            listId: {
              select: trigger.path.listId,
              against: z.string().uuid(),
            },
          }),
        }),
        execute: async ({ trigger, input }) => {
          return saveEntity(tables.tasks, {
            name: trigger.body.name,
            listId: input.listId,
          });
        },
      }),
      workflow('UpdateTaskWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'put',
          path: '/tasks/:id',
        }),
        execute: async ({ trigger }) => {
          const qb = createQueryBuilder(tables.tasks, 'tasks').where(
            'id = :id',
            { id: trigger.path.id },
          );
          const task = await patchEntity(qb, {
            name: trigger.body.name,
            description: trigger.body.description,
            status: trigger.body.status,
            dueDate: trigger.body.dueDate,
            favourite: trigger.body.favourite,
          });
          return { task };
        },
      }),
      workflow('RemoveTaskWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'delete',
          path: '/tasks/:id',
        }),
        execute: async ({ trigger }) => {
          await removeEntity(
            tables.tasks,
            createQueryBuilder(tables.tasks, 'tasks').where('id = :id', {
              id: trigger.path.id,
            }),
          );
        },
      }),
      workflow('CompleteTaskWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'post',
          path: '/tasks/:id/complete',
        }),
        execute: async ({ trigger }) => {
          const qb = createQueryBuilder(tables.tasks, 'tasks').where(
            'id = :id',
            { id: trigger.path.id },
          );
          await patchEntity(qb, { status: 'completed' });
        },
      }),
      workflow('UncompleteTaskWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'post',
          path: '/tasks/:id/uncomplete',
        }),
        execute: async ({ trigger }) => {
          await patchEntity(
            createQueryBuilder(tables.tasks, 'tasks').where('id = :id', {
              id: trigger.path.id,
            }),
            { status: 'todo' },
          );
        },
      }),
      workflow('MoveTaskWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'post',
          path: '/tasks/:id/move',
        }),
        execute: async ({ trigger }) => {
          await patchEntity(
            createQueryBuilder(tables.tasks, 'tasks').where('id = :id', {
              id: trigger.path.id,
            }),
            { list: trigger.body.listId },
          );
        },
      }),
      workflow('ListTasksWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'get',
          path: '/',
        }),
        execute: async ({ trigger }) => {
          const qb = createQueryBuilder(tables.tasks, 'tasks').orderBy(
            'name',
            'ASC',
          );
          const paginationMetadata = deferredJoinPagination(qb, {
            pageSize: trigger.query.pageSize,
            pageNo: trigger.query.pageNo,
            count: await qb.getCount(),
          });
          const records = await execute(qb);
          return {
            meta: paginationMetadata(records),
            records: records,
          };
        },
      }),
      workflow('StarTaskWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'post',
          path: '/tasks/:id/star',
        }),
        execute: async ({ trigger }) => {
          await patchEntity(
            createQueryBuilder(tables.tasks, 'tasks').where('id = :id', {
              id: trigger.path.id,
            }),
            { favourite: true },
          );
        },
      }),
      workflow('DeleteCompletedTasksWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'delete',
          path: '/completed',
        }),
        execute: async () => {
          await removeEntity(
            tables.tasks,
            createQueryBuilder(tables.tasks, 'tasks').where(
              'status = :status',
              { status: 'completed' },
            ),
          );
        },
      }),
      // #endregion

      // #region Lists
      workflow('AddSubListWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'post',
          path: '/sublists/:taskId',
          input: (trigger) => ({
            taskId: {
              select: trigger.path.listId,
              against: z.string().uuid(),
            },
            listId: {
              select: trigger.path.listId,
              against: z.string().uuid(),
            },
          }),
        }),
        execute: async ({ input, trigger }) => {
          await saveEntity(tables.lists, {
            name: trigger.body.name,
            parentTaskId: input.taskId,
          });
        },
      }),
      workflow('AddTaskToSubListWorkflow', {
        tag: 'lists',
        trigger: trigger.http({
          method: 'post',
          path: '/:listId/tasks',
          input: (trigger) => ({
            listId: {
              select: trigger.path.listId,
              against: z.string().uuid(),
            },
          }),
        }),
        execute: async ({ input, trigger }) => {
          await patchEntity(
            createQueryBuilder(tables.lists, 'lists').where('id = :id', {
              id: input.listId,
            }),
            { tasks: trigger.body.tasks },
          );
        },
      }),

      workflow('CreateListWorkflow', {
        tag: 'lists',
        trigger: trigger.http({
          method: 'post',
          path: '/',
        }),
        execute: async ({ trigger }) => {
          return saveEntity(tables.lists, {
            name: trigger.body.name,
          });
        },
      }),
      workflow('UpdateListWorkflow', {
        tag: 'lists',
        trigger: trigger.http({
          method: 'put',
          path: '/:id',
        }),
        execute: async ({ trigger }) => {
          await patchEntity(
            createQueryBuilder(tables.lists, 'lists').where('id = :id', {
              id: trigger.path.id,
            }),
            { name: trigger.body.name },
          );
        },
      }),
      workflow('DeleteListWorkflow', {
        tag: 'lists',
        trigger: trigger.http({
          method: 'delete',
          path: '/:id',
        }),
        execute: async ({ trigger }) => {
          await removeEntity(
            tables.lists,
            createQueryBuilder(tables.lists, 'lists').where('id = :id', {
              id: trigger.path.id,
            }),
          );
        },
      }),
      workflow('ListListsWorkflow', {
        tag: 'lists',
        trigger: trigger.http({
          method: 'get',
          path: '/',
        }),
        execute: async ({ trigger }) => {
          const qb = createQueryBuilder(tables.lists, 'lists');
          const paginationMetadata = deferredJoinPagination(qb, {
            pageSize: trigger.query.pageSize,
            pageNo: trigger.query.pageNo,
            count: await qb.getCount(),
          });
          const records = await execute(qb);
          return {
            meta: paginationMetadata(records),
            records: records,
          };
        },
      }),
    ],
    tables: {
      tasks: table({
        fields: {
          name: field.shortText(),
          description: field.longText(),
          list: field.relation({
            references: useTable('lists'),
            relationship: 'many-to-one',
            validations: [mandatory()],
          }),
          status: field.enum({
            values: ['todo', 'completed'],
            defaultValue: 'todo',
          }),
          dueDate: field.datetime(),
          favourite: field({ type: 'boolean' }),
        },
      }),
      lists: table({
        fields: {
          name: field.shortText(),
          parentTask: field.relation({
            references: useTable('tasks'),
            relationship: 'many-to-one',
          }),
        },
      }),
    },
  }),
);
