/**
 * API suite 02 - return requests: authentication, validation, full lifecycle, authorization.
 *
 * Each test builds its own data (unique SHOP-xxxxx reference) and never depends on
 * another test's leftovers: the suite can run in any order, in parallel, or alone.
 */
const { ticketPayload } = require('../../cypress/support/utils');

describe('API 02 - return requests (tickets)', () => {
  it('API-09 - refuses an unauthenticated call with 401 and a Bearer challenge', () => {
    cy.apiRequest('GET', '/tickets').then((response) => {
      expect(response.status).to.eq(401);
      expect(response.headers['www-authenticate']).to.eq('Bearer');
      expect(response.body.error.code).to.eq('UNAUTHORIZED');
    });

    cy.apiRequest('GET', '/tickets', { token: 'deadbeef' }).then((response) => {
      expect(response.status).to.eq(401); // an invented token is not a token
    });
  });

  it('API-10 - rejects an invalid payload with 422 and one message per field', () => {
    cy.apiLogin().then((token) => {
      cy.apiRequest('POST', '/tickets', {
        token,
        body: {
          reference: 'SHOP-12',
          name: 'Al',
          quantity: 9,
          description: 'too short',
          purchasedOn: '2999-01-01',
          terms: false
        }
      }).then((response) => {
        expect(response.status).to.eq(422);
        expect(response.body.error.code).to.eq('VALIDATION_FAILED');
        expect(response.body.error.errors).to.have.all.keys(
          'reference',
          'name',
          'quantity',
          'description',
          'purchasedOn',
          'terms'
        );
        expect(response.body.error.errors.reference).to.eq('Use the format SHOP-12345');
        expect(response.body).to.not.have.property('id');
      });
    });
  });

  it('API-11 - creates a request (201 + Location) that can be read back identically', () => {
    const payload = ticketPayload({ photo: { name: 'damage.png', size: 2048 } });

    cy.apiLogin().then((token) => {
      cy.apiRequest('POST', '/tickets', { token, body: payload }).then((created) => {
        expect(created.status).to.eq(201);
        expect(created.headers.location).to.match(/^\/api\/v1\/tickets\/TCK-\d{4}$/);
        expect(created.headers['cache-control']).to.eq('no-store');
        expect(created.body).to.include({
          reference: payload.reference,
          name: payload.name,
          quantity: payload.quantity,
          status: 'OPEN'
        });
        expect(created.body.photo).to.deep.eq({ name: 'damage.png', size: 2048 });
        expect(created.body.id).to.match(/^TCK-\d{4}$/);

        cy.apiRequest('GET', created.headers.location.replace('/api/v1', ''), { token }).then((read) => {
          expect(read.status).to.eq(200);
          expect(read.body).to.deep.eq(created.body); // what was stored is what is served
        });
      });
    });
  });

  it('API-12 - updates the status, deletes the request, then answers 404', () => {
    cy.apiLogin().then((token) => {
      cy.apiCreateTicket(token, ticketPayload()).then((ticket) => {
        cy.apiRequest('PATCH', `/tickets/${ticket.id}`, { token, body: { status: 'CLOSED' } }).then(
          (patched) => {
            expect(patched.status).to.eq(200);
            expect(patched.body).to.include({ id: ticket.id, status: 'CLOSED' });
          }
        );

        cy.apiRequest('PATCH', `/tickets/${ticket.id}`, { token, body: { status: 'ARCHIVED' } }).then(
          (refused) => {
            expect(refused.status).to.eq(422);
            expect(refused.body.error.errors).to.have.property('status');
          }
        );

        cy.apiRequest('DELETE', `/tickets/${ticket.id}`, { token }).then((deleted) => {
          expect(deleted.status).to.eq(204);
          expect(deleted.body).to.be.oneOf(['', undefined, null]);
        });

        cy.apiRequest('GET', `/tickets/${ticket.id}`, { token }).then((gone) => {
          expect(gone.status).to.eq(404);
          expect(gone.body.error.code).to.eq('TICKET_NOT_FOUND');
        });
      });
    });
  });

  it('API-13 - a second user cannot read or delete another user request (403)', () => {
    const payload = ticketPayload();

    cy.apiLogin('primary').then((ownerToken) => {
      cy.apiCreateTicket(ownerToken, payload).then((ticket) => {
        cy.apiLogin('secondary').then((otherToken) => {
          cy.apiRequest('GET', `/tickets/${ticket.id}`, { token: otherToken }).then((response) => {
            expect(response.status).to.eq(403);
            expect(response.body.error.code).to.eq('FORBIDDEN');
            expect(response.body).to.not.have.property('reference');
          });

          cy.apiRequest('DELETE', `/tickets/${ticket.id}`, { token: otherToken }).then((response) => {
            expect(response.status).to.eq(403);
          });

          // The owner still sees the request: the refused call changed nothing.
          cy.apiRequest('GET', `/tickets/${ticket.id}`, { token: ownerToken })
            .its('body.reference')
            .should('eq', payload.reference);
        });
      });
    });
  });
});
