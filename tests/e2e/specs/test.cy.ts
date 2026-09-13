describe('Sign-in screen', () => {
  it('shows the workspace introduction and Google sign-in', () => {
    cy.visit('/');
    cy.contains('h2', 'Welcome aboard.');
    cy.contains('button', 'Continue with Google').should('be.enabled');
    cy.get('ion-router-outlet').should('not.exist');
  });
  it('keeps the sign-in button visible on a phone', () => {
    cy.viewport(390, 844);
    cy.visit('/home');
    cy.contains('button', 'Continue with Google').should('be.visible');
    cy.get('.login-page').then(($page) => {
      expect($page[0].scrollWidth).to.be.at.most(390);
    });
  });
});
