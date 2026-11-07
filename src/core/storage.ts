/**
Save and restore a JSON object to and from local storage.
*/

interface Storage {
  store: (key: string, obj: unknown) => boolean;
  restore: <T extends object>(key: string, target: T) => T;
  clear: (key: string) => void;
}

const storage: Storage = {
  store: function (key: string, obj: unknown): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
      return true;
    } catch (e) {
      return false;
    }
  },
  restore: function <T extends object>(key: string, target: T): T {
    const obj = JSON.parse(localStorage.getItem(key) || "{}");
    Object.assign(target, obj);
    return target;
  },
  clear: function (key: string): void {
    localStorage.removeItem(key);
  },
};

export default storage;
