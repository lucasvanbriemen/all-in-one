export const format = {
  money(value = 0){
    return `€${value.toString().replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
  }
};
