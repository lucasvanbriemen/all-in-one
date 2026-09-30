export const format = {
  money(value = 0){
    return `€${value.toString().replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
  },

  date(value){
    date = new Date(value);

    // Return Fr 23 oct
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
  }
};
