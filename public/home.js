import { Sidebar } from '/modules/main.js';
$(document).ready(() => {
  $.ajax({
    url: '/service/get-permissions',
    type: 'GET',
    success: result => {
      if (result && result.status === 'success') {
        var perms = result.permissions;
        if (perms === 'EDIT') {
          $('.card-container').append($.parseHTML(
            '<a href="/new-quiz" class="card">' +
            '<ion-icon name="add-circle-sharp"></ion-icon>' +
            '<h3>Add a new Quiz</h3>' +
          '</a>'
          ));
          Sidebar(perms);
        }
      }
      else {
        console.log('Failed to get user permissions');
      }
    },
    error: err => {
      console.log(err);
      console.log('Failed to get user permissions');
    }
  });
});