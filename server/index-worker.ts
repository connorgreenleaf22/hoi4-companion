import {parentPort,workerData} from 'node:worker_threads';
import {openStore} from './store';
import {indexGame} from './importer';
// Same importer, schema and transactions. Close the private connection before exit.
const store=openStore(workerData.directory);
try{parentPort!.postMessage(indexGame(store,workerData.root));}finally{store.db.close();}
