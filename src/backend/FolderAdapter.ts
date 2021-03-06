import {BaseFileSystem, FileSystem} from '../core/file_system';
import path = require('path');
import {ApiError} from '../core/api_error';

/**
 * The FolderAdapter file system wraps a file system, and scopes all interactions to a subfolder of that file system.
 */
export default class FolderAdapter extends BaseFileSystem implements FileSystem {
  private _wrapped: FileSystem;
  private _folder: string;
  constructor(folder: string, wrapped: FileSystem) {
    super();
    this._folder = folder;
    this._wrapped = wrapped;
  }

  /**
   * Initialize the file system. Ensures that the wrapped file system
   * has the given folder.
   */
  public initialize(cb: (e?: ApiError) => void) {
    this._wrapped.exists(this._folder, (exists: boolean) => {
      if (exists) {
        cb();
      } else if (this._wrapped.isReadOnly()) {
        cb(ApiError.ENOENT(this._folder));
      } else {
        this._wrapped.mkdir(this._folder, 0x1ff, cb);
      }
    });
  }

  public getName(): string { return this._wrapped.getName(); }
  public isReadOnly(): boolean { return this._wrapped.isReadOnly(); }
  public supportsProps(): boolean { return this._wrapped.supportsProps(); }
  public supportsSynch(): boolean { return this._wrapped.supportsSynch(); }
  public supportsLinks(): boolean { return false; }

  public static isAvailable(): boolean {
    return true;
  }
}

function translateError(folder: string, e: any): any {
  if (e !== null && typeof e === 'object') {
    let err = <ApiError> e;
    let p = err.path;
    if (p) {
      p = '/' + path.relative(folder, p);
      err.message = err.message.replace(err.path, p);
      err.path = p;
    }
  }
  return e;
}

function wrapCallback(folder: string, cb: any): any {
  if (typeof cb === 'function') {
    return function(err) {
      if (arguments.length > 0) {
        arguments[0] = translateError(folder, err);
      }
      (<Function> cb).apply(null, arguments);
    };
  } else {
    return cb;
  }
}

function wrapFunction(name: string, wrapFirst: boolean, wrapSecond: boolean): Function {
  if (name.slice(name.length - 4) !== 'Sync') {
    // Async function. Translate error in callback.
    return function() {
      if (arguments.length > 0) {
        if (wrapFirst) {
          arguments[0] = path.join(this._folder, arguments[0]);
        }
        if (wrapSecond) {
          arguments[1] = path.join(this._folder, arguments[1]);
        }
        arguments[arguments.length - 1] = wrapCallback(this._folder, arguments[arguments.length - 1]);
      }
      return this._wrapped[name].apply(this._wrapped, arguments);
    };
  } else {
    // Sync function. Translate error in catch.
    return function() {
      try {
        if (wrapFirst) {
          arguments[0] = path.join(this._folder, arguments[0]);
        }
        if (wrapSecond) {
          arguments[1] = path.join(this._folder, arguments[1]);
        }
        return this._wrapped[name].apply(this._wrapped, arguments);
      } catch (e) {
        throw translateError(this._folder, e);
      }
    };
  }
}

// First argument is a path.
['diskSpace', 'stat', 'statSync', 'open', 'openSync', 'unlink', 'unlinkSync',
 'rmdir', 'rmdirSync' ,'mkdir', 'mkdirSync', 'readdir', 'readdirSync', 'exists',
 'existsSync', 'realpath', 'realpathSync', 'truncate', 'truncateSync', 'readFile',
 'readFileSync', 'writeFile', 'writeFileSync', 'appendFile', 'appendFileSync',
 'chmod', 'chmodSync', 'chown', 'chownSync', 'utimes', 'utimeSync', 'readlink',
 'readlinkSync'].forEach((name: string) => {
  FolderAdapter.prototype[name] = wrapFunction(name, true, false);
});

// First and second arguments are paths.
['rename', 'renameSync', 'link', 'linkSync', 'symlink', 'symlinkSync'].forEach((name: string) => {
  FolderAdapter.prototype[name] = wrapFunction(name, true, true);
});
