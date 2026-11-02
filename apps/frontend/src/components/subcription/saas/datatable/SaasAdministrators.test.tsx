import { SaasAdministrators } from '@/components/subcription/saas/datatable/SaasAdministrators';
import testRender from '@/utils/test/test-render';
import { TooltipProvider } from '@filigran/design-system';
import { fireEvent, screen, within } from '@testing-library/react';

const ADMINISTRATOR_EMAILS = ['admin@filigran.io', 'other.admin@filigran.io'];

const renderAdministrators = (emails: string[]) =>
  testRender(
    <TooltipProvider>
      <SaasAdministrators emails={emails} />
    </TooltipProvider>
  );

describe('SaasAdministrators', () => {
  it('should display the emails of the organization administrators', () => {
    // Given an organization with several administrators
    // When its administrators are rendered
    const { container } = renderAdministrators(ADMINISTRATOR_EMAILS);

    // Then every administrator email is shown
    expect(container).toHaveTextContent(ADMINISTRATOR_EMAILS.join(', '));
  });

  it('should list every administrator email in a tooltip when the organization has several administrators', async () => {
    // Given an organization with several administrators
    renderAdministrators(ADMINISTRATOR_EMAILS);

    // When the user focuses its administrators
    fireEvent.focus(screen.getByText(ADMINISTRATOR_EMAILS.join(', ')));

    // Then a tooltip lists each administrator email
    const tooltip = await screen.findByRole('tooltip');
    for (const email of ADMINISTRATOR_EMAILS) {
      expect(within(tooltip).getByText(email)).toBeInTheDocument();
    }
  });

  it('should display the email without a tooltip when the organization has a single administrator', () => {
    // Given an organization with a single administrator
    const [email] = ADMINISTRATOR_EMAILS;
    const { container } = renderAdministrators([email]);

    // When the user focuses its administrator
    fireEvent.focus(screen.getByText(email));

    // Then the email is shown and no tooltip opens
    expect(container).toHaveTextContent(email);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
