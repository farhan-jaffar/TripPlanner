import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormattedMessage, InlineContent } from '../components/ui/FormattedMessage';

describe('FormattedMessage Component', () => {
  it('renders bold text as a strong tag without raw asterisks', () => {
    render(<FormattedMessage content="This is **bold text** and regular text." />);

    const strongEl = screen.getByText('bold text');
    expect(strongEl).toBeInTheDocument();
    expect(strongEl.tagName).toBe('STRONG');
    expect(screen.queryByText(/\*\*bold text\*\*/)).not.toBeInTheDocument();
    expect(screen.getByText(/This is/)).toBeInTheDocument();
  });

  it('renders italic text as an em tag without raw asterisks', () => {
    render(<FormattedMessage content="This is *italicized* text." />);

    const emEl = screen.getByText('italicized');
    expect(emEl).toBeInTheDocument();
    expect(emEl.tagName).toBe('EM');
    expect(screen.queryByText(/\*italicized\*/)).not.toBeInTheDocument();
  });

  it('renders inline code as a code tag without backticks', () => {
    render(<FormattedMessage content="Run `add_stop` to proceed." />);

    const codeEl = screen.getByText('add_stop');
    expect(codeEl).toBeInTheDocument();
    expect(codeEl.tagName).toBe('CODE');
    expect(screen.queryByText(/`add_stop`/)).not.toBeInTheDocument();
  });

  it('renders bullet lists with bold item titles', () => {
    const markdown = `
Here are recommendations:
* **Kinkaku-ji**: Golden Pavilion
* **Fushimi Inari**: Torii gates
    `;

    render(<FormattedMessage content={markdown} />);

    expect(screen.getByText('Kinkaku-ji')).toBeInTheDocument();
    expect(screen.getByText('Fushimi Inari')).toBeInTheDocument();

    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBe(2);
  });

  it('renders ordered lists correctly', () => {
    const markdown = `
1. **Morning**: Visit Kiyomizu-dera
2. **Afternoon**: Explore Gion district
    `;

    render(<FormattedMessage content={markdown} />);

    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Afternoon')).toBeInTheDocument();
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
  });

  it('renders headings and blockquotes', () => {
    const markdown = `
### Kyoto Highlights
> A wonderful historic journey.
    `;

    render(<FormattedMessage content={markdown} />);

    const heading = screen.getByRole('heading', { level: 5 });
    expect(heading).toHaveTextContent('Kyoto Highlights');
    expect(screen.getByText('A wonderful historic journey.')).toBeInTheDocument();
  });

  it('renders markdown links properly', () => {
    render(<FormattedMessage content="Visit [Kyoto Travel](https://kyoto.travel) for info." />);

    const link = screen.getByRole('link', { name: 'Kyoto Travel' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://kyoto.travel');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders markdown tables cleanly', () => {
    const markdown = `
| Day | Location |
| --- | --- |
| Day 1 | Tokyo |
| Day 2 | Kyoto |
    `;

    render(<FormattedMessage content={markdown} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Kyoto')).toBeInTheDocument();
  });

  it('handles user styling vs assistant styling', () => {
    const { rerender } = render(<FormattedMessage content="**User Note**" isUser={true} />);
    const userStrong = screen.getByText('User Note');
    expect(userStrong).toHaveClass('text-white');

    rerender(<FormattedMessage content="**Assistant Note**" isUser={false} />);
    const assistantStrong = screen.getByText('Assistant Note');
    expect(assistantStrong).toHaveClass('text-sand-950');
  });
});
