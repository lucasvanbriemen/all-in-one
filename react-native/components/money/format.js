export const format = {
  money(value = 0){

    value = Number(value);
    value = value.toFixed(2);

    return `€${value.toString().replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
  },

  date(value){
    const date = new Date(value);

    // Return Fr 23 oct
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
  }
};
