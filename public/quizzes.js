import { Sidebar } from '/modules/main.js';
$(document).ready(() => {
  Sidebar();

  $.ajax({
    url: '/service/get-quizzes',
    type: 'GET',
    success: result => {
      var cards = $.parseHTML(result);

      $(cards).each((i, elem) => {
        var delButton = $(elem).find('a.quiz-delete[data-href]'); //creating delete button when pressed deletes quiz
        if (delButton) {
          $(delButton).click(() => {
            $.ajax({
              url: $(delButton).attr('data-href'),
              type: 'POST',
              success: result => {
                if (!result || !result.status === 'success') {
                  alert('Delete quiz failed');
                }
                location.reload();
              }
            });
          });
        }

        $('.card-container').append($(elem));
      });
    }
  });
});