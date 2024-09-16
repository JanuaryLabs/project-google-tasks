import { run } from '@january/extensions';
import { FlyExtension } from '@january/extensions/fly';
import { PostgreSQLExtension } from '@january/extensions/postgresql';

run([
new	PostgreSQLExtension,
new 	FlyExtension,]
);