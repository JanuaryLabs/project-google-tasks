import {
  createQueryBuilder,
  deferredJoinPagination,
  execute,
  patchEntity,
  removeEntity,
  saveEntity
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
import { tables } from '@workspace/entites';
export default project(
  feature('Tasks', {
    workflows: [
      workflow('CreateTaskWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'post',
          path: '/tasks',
        }),
        execute: async (trigger) => {
          return saveEntity(tables.tasks, {
            name: trigger.body.name,
          });

        },
      }),
      workflow('UpdateTaskWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'put',
          path: '/tasks/:id',
        }),
        execute: async (trigger) => {
          const qb = createQueryBuilder(tables.tasks, 'tasks').where('id = :id', { id: trigger.path.id });
          const task = await patchEntity(qb,
            {
              name: trigger.body.name,
              description: trigger.body.description,
              status: trigger.body.status,
              dueDate: trigger.body.dueDate,
              favourite: trigger.body.favourite,
            }
          );
          return { task };
        },
      }),
      workflow('RemoveTaskWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'delete',
          path: '/tasks/:id',
        }),
        execute: async (trigger) => {
          await removeEntity(
            tables.tasks,
            createQueryBuilder(tables.tasks, 'tasks').where('id = :id', { id: trigger.path.id })
          );
        },
      }),
      workflow('CompleteTaskWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'post',
          path: '/tasks/:id/complete',
        }),
        execute: async (trigger) => {
          const qb =createQueryBuilder(tables.tasks, 'tasks').where('id = :id', { id: trigger.path.id })
          await patchEntity(qb,
            { status: 'completed' }
          );
        },
      }),
      workflow('UncompleteTaskWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'post',
          path: '/tasks/:id/uncomplete',
        }),
        execute: async (trigger) => {
          await patchEntity(
            createQueryBuilder(tables.tasks, 'tasks').where('id = :id', { id: trigger.path.id }),
            { status: 'todo' }
          );
        },
      }),
      workflow('MoveTaskWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'post',
          path: '/tasks/:id/move',
        }),
        execute: async (trigger) => {
          await patchEntity(
            createQueryBuilder(tables.tasks, 'tasks').where('id = :id', { id: trigger.path.id }),
            { list: trigger.body.listId }
          );
        },
      }),
      workflow('StarTaskWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'post',
          path: '/tasks/:id/star',
        }),
        execute: async (trigger) => {
          await patchEntity(
            createQueryBuilder(tables.tasks, 'tasks').where('id = :id', { id: trigger.path.id }),
            { favourite: true }
          );
        },
      }),
      workflow('CreateListWorkflow', {
        tag: 'lists',
        trigger: trigger.http({
          method: 'post',
          path: '/',
        }),
        execute: async (trigger) => {
          return   saveEntity(tables.lists, {
            name: trigger.body.name,
            innerList: trigger.body.innerList,
          });
         },
      }),
      workflow('UpdateListWorkflow', {
        tag: 'lists',
        trigger: trigger.http({
          method: 'put',
          path: '/:id',
        }),
        execute: async (trigger) => {
          await patchEntity(
            createQueryBuilder(tables.lists, 'lists').where('id = :id', { id: trigger.path.id }),
            { name: trigger.body.name }
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
            createQueryBuilder(tables.tasks, 'tasks').where('status = :status', { status: 'completed' })
          );
        },
      }),
      workflow('DeleteListWorkflow', {
        tag: 'lists',
        trigger: trigger.http({
          method: 'delete',
          path: '/:id',
        }),
        execute: async (trigger) => {
          await removeEntity(
            tables.lists,
            createQueryBuilder(tables.lists, 'lists').where('id = :id', { id: trigger.path.id })
          );
        },
      }),
      workflow('ListListsWorkflow', {
        tag: 'lists',
        trigger: trigger.http({
          method: 'get',
          path: '/',
        }),
        execute: async (trigger) => {
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
      workflow('ListTasksWorkflow', {
        tag: 'tasks',
        trigger: trigger.http({
          method: 'get',
          path: '/',
        }),
        execute: async (trigger) => {
          const qb = createQueryBuilder(tables.tasks, 'tasks').orderBy('name', 'ASC');
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
          name: field({ type: 'short-text' }),
          description: field({ type: 'long-text' }),
          list: field.relation({
            references: useTable('lists'),
            relationship: 'many-to-one',
            validations: [mandatory()],
          }),
          subList: field.relation({
            references: useTable('lists'),
            relationship: 'many-to-one',
          }),
          status: field.enum({
            values: ['todo', 'completed'],
            defaultValue: 'todo',
          }),
          dueDate: field({ type: 'datetime' }),
          favourite: field({ type: 'boolean' }),
        },
      }),
      lists: table({
        fields: {
          name: field({ type: 'short-text' }),
          innerList: field({ type: 'boolean' }),
        },
      }),
    },
  }),
);