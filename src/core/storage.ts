/**
Save and restore a JSON object to and from local storage.
*/

interface Storage {
  store: (key: string, obj: any) => boolean;
  restore: (key: string, target?: any) => any;
  clear: (key: string) => void;
}

const storage: Storage = {
  store: function (key: string, obj: any): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
      return true;
    } catch (e) {
      return false;
    }
  },
  restore: function (key: string, target: any = {}): any {
    const obj = JSON.parse(localStorage.getItem(key) || "{}");
    Object.assign(target, obj);
    return target;
  },
  clear: function (key: string): void {
    localStorage.removeItem(key);
  },
};

export default storage;
