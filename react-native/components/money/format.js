import {NativeEventEmitter, NativeModules} from 'react-native';

export const format = {
  money(value){
    return `€${value.toString().replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
  }
};
