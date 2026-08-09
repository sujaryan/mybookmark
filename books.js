/**
 * mybookmark - Shared book catalogue
 * Used by both index.html (member dashboard) and admin.html (CRM).
 *
 * Each book includes:
 *   - Catalogue metadata (title, author, genre, pages, Amazon price)
 *   - Unit economics inputs (popularity, expectedAnnualRentals)
 *   - Inventory state (status, condition, current borrower, total rentals)
 *
 * Unit economics model:
 *   - Revenue per rental ≈ ₹43 (blended gross margin across plans)
 *   - Book lifespan ≈ 3 years before replacement
 *   - Annual revenue per book = expectedAnnualRentals × revenuePerRental
 *   - Year-1 ROI = annual revenue / amazon price × 100
 *   - 3-year profit = annual revenue × 3 - amazon price
 */

const ECON = {
  revenuePerRentalINR: 43,
  bookLifespanYears: 3
};

const CATALOGUE = [
  // Non-fiction / Self-help / Business
  { id: 'b001', title: 'Atomic Habits', author: 'James Clear', genre: 'Self-help', pages: 320, amazonPrice: 399, coverGradient: 'cover-orange', coverImage: 'https://covers.openlibrary.org/b/isbn/9780735211292-M.jpg', description: 'Tiny changes, remarkable results', popularity: 5, expectedAnnualRentals: 22, status: 'checked-out', condition: 'good', currentBorrower: 'Priya Sharma', dateAcquired: '2026-02-15', totalRentals: 8 },
  { id: 'b002', title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'History', pages: 464, amazonPrice: 450, coverGradient: 'cover-forest', coverImage: 'https://covers.openlibrary.org/b/isbn/9780062316097-M.jpg', description: 'A brief history of humankind', popularity: 5, expectedAnnualRentals: 20, status: 'checked-out', condition: 'good', currentBorrower: 'Priya Sharma', dateAcquired: '2026-02-15', totalRentals: 6 },
  { id: 'b003', title: 'The Psychology of Money', author: 'Morgan Housel', genre: 'Finance', pages: 256, amazonPrice: 350, coverGradient: 'cover-blue', coverImage: 'https://covers.openlibrary.org/b/isbn/9780857197689-M.jpg', description: 'Timeless lessons on wealth, greed, and happiness', popularity: 5, expectedAnnualRentals: 20, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-02-15', totalRentals: 7 },
  { id: 'b004', title: 'Educated', author: 'Tara Westover', genre: 'Memoir', pages: 352, amazonPrice: 400, coverGradient: 'cover-purple', coverImage: 'https://covers.openlibrary.org/b/isbn/9780399590504-M.jpg', description: 'A memoir about education, family, and self-invention', popularity: 4, expectedAnnualRentals: 14, status: 'checked-out', condition: 'worn', currentBorrower: 'Priya Sharma', dateAcquired: '2026-01-20', totalRentals: 11 },
  { id: 'b005', title: 'Deep Work', author: 'Cal Newport', genre: 'Productivity', pages: 304, amazonPrice: 400, coverGradient: 'cover-green', coverImage: 'https://covers.openlibrary.org/b/isbn/9781455586691-M.jpg', description: 'Rules for focused success in a distracted world', popularity: 4, expectedAnnualRentals: 14, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-02-20', totalRentals: 5 },
  { id: 'b006', title: 'Outliers', author: 'Malcolm Gladwell', genre: 'Non-fiction', pages: 320, amazonPrice: 350, coverGradient: 'cover-orange', coverImage: 'https://covers.openlibrary.org/b/isbn/9780316017930-M.jpg', description: 'The story of success', popularity: 4, expectedAnnualRentals: 14, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-03-01', totalRentals: 4 },
  { id: 'b007', title: 'The Subtle Art of Not Giving a F*ck', author: 'Mark Manson', genre: 'Self-help', pages: 224, amazonPrice: 400, coverGradient: 'cover-orange', coverImage: 'https://covers.openlibrary.org/b/isbn/9780062457714-M.jpg', description: 'A counterintuitive approach to living a good life', popularity: 5, expectedAnnualRentals: 18, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-02-25', totalRentals: 6 },
  { id: 'b008', title: 'Zero to One', author: 'Peter Thiel', genre: 'Business', pages: 224, amazonPrice: 400, coverGradient: 'cover-gold', coverImage: 'https://covers.openlibrary.org/b/isbn/9780804139298-M.jpg', description: 'Notes on startups, or how to build the future', popularity: 4, expectedAnnualRentals: 14, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-03-10', totalRentals: 3 },
  { id: 'b009', title: 'The Lean Startup', author: 'Eric Ries', genre: 'Business', pages: 336, amazonPrice: 450, coverGradient: 'cover-green', coverImage: 'https://covers.openlibrary.org/b/isbn/9780307887894-M.jpg', description: 'How constant innovation creates successful businesses', popularity: 4, expectedAnnualRentals: 12, status: 'available', condition: 'worn', currentBorrower: null, dateAcquired: '2026-01-10', totalRentals: 10 },
  { id: 'b010', title: 'Think Again', author: 'Adam Grant', genre: 'Non-fiction', pages: 320, amazonPrice: 450, coverGradient: 'cover-blue', coverImage: 'https://covers.openlibrary.org/b/isbn/9781984878106-M.jpg', description: 'The power of knowing what you don\'t know', popularity: 4, expectedAnnualRentals: 12, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-03-20', totalRentals: 2 },

  // Fiction / Literary
  { id: 'b011', title: 'The Midnight Library', author: 'Matt Haig', genre: 'Fiction', pages: 304, amazonPrice: 350, coverGradient: 'cover-orange', coverImage: 'https://covers.openlibrary.org/b/isbn/9780525559474-M.jpg', description: 'Between life and death, there is a library', popularity: 5, expectedAnnualRentals: 18, status: 'checked-out', condition: 'good', currentBorrower: 'Priya Sharma', dateAcquired: '2026-02-20', totalRentals: 7 },
  { id: 'b012', title: 'The Alchemist', author: 'Paulo Coelho', genre: 'Fiction', pages: 192, amazonPrice: 250, coverGradient: 'cover-gold', coverImage: 'https://covers.openlibrary.org/b/isbn/9780062315007-M.jpg', description: 'A shepherd\'s journey to find his treasure', popularity: 5, expectedAnnualRentals: 22, status: 'available', condition: 'worn', currentBorrower: null, dateAcquired: '2026-01-05', totalRentals: 12 },
  { id: 'b013', title: 'The God of Small Things', author: 'Arundhati Roy', genre: 'Literary fiction', pages: 340, amazonPrice: 400, coverGradient: 'cover-purple', coverImage: 'https://covers.openlibrary.org/b/isbn/9780679457312-M.jpg', description: 'Booker Prize-winning Indian novel', popularity: 4, expectedAnnualRentals: 12, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-02-10', totalRentals: 5 },
  { id: 'b014', title: 'The White Tiger', author: 'Aravind Adiga', genre: 'Literary fiction', pages: 320, amazonPrice: 350, coverGradient: 'cover-orange-dark', coverImage: 'https://covers.openlibrary.org/b/isbn/9781416562603-M.jpg', description: 'Booker Prize-winning dark satire of modern India', popularity: 4, expectedAnnualRentals: 12, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-02-12', totalRentals: 4 },
  { id: 'b015', title: '1984', author: 'George Orwell', genre: 'Classic', pages: 328, amazonPrice: 250, coverGradient: 'cover-ink', coverImage: 'https://covers.openlibrary.org/b/isbn/9780451524935-M.jpg', description: 'A dystopian masterpiece', popularity: 4, expectedAnnualRentals: 14, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-01-15', totalRentals: 8 },
  { id: 'b016', title: 'To Kill a Mockingbird', author: 'Harper Lee', genre: 'Classic', pages: 336, amazonPrice: 300, coverGradient: 'cover-green', coverImage: 'https://covers.openlibrary.org/b/isbn/9780060935467-M.jpg', description: 'A Pulitzer Prize-winning novel of justice and childhood', popularity: 4, expectedAnnualRentals: 12, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-01-20', totalRentals: 6 },
  { id: 'b017', title: 'The Namesake', author: 'Jhumpa Lahiri', genre: 'Fiction', pages: 304, amazonPrice: 350, coverGradient: 'cover-blue', coverImage: 'https://covers.openlibrary.org/b/isbn/9780618485222-M.jpg', description: 'An Indian-American family saga', popularity: 4, expectedAnnualRentals: 12, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-02-18', totalRentals: 5 },
  { id: 'b018', title: 'A Fine Balance', author: 'Rohinton Mistry', genre: 'Literary fiction', pages: 624, amazonPrice: 500, coverGradient: 'cover-purple', coverImage: 'https://covers.openlibrary.org/b/isbn/9781400030651-M.jpg', description: 'Set during India\'s Emergency', popularity: 3, expectedAnnualRentals: 8, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-02-05', totalRentals: 3 },

  // Memoir / Biography
  { id: 'b019', title: 'Wings of Fire', author: 'APJ Abdul Kalam', genre: 'Biography', pages: 180, amazonPrice: 250, coverGradient: 'cover-orange', coverImage: 'https://covers.openlibrary.org/b/isbn/9788173711466-M.jpg', description: 'Autobiography of India\'s missile man', popularity: 4, expectedAnnualRentals: 15, status: 'available', condition: 'worn', currentBorrower: null, dateAcquired: '2026-01-08', totalRentals: 9 },
  { id: 'b020', title: 'Born a Crime', author: 'Trevor Noah', genre: 'Memoir', pages: 304, amazonPrice: 400, coverGradient: 'cover-green', coverImage: 'https://covers.openlibrary.org/b/isbn/9780399588174-M.jpg', description: 'Stories from a South African childhood', popularity: 4, expectedAnnualRentals: 16, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-02-22', totalRentals: 6 },
  { id: 'b021', title: 'When Breath Becomes Air', author: 'Paul Kalanithi', genre: 'Memoir', pages: 256, amazonPrice: 350, coverGradient: 'cover-blue', coverImage: 'https://covers.openlibrary.org/b/isbn/9780812988406-M.jpg', description: 'A neurosurgeon faces his own mortality', popularity: 4, expectedAnnualRentals: 14, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-02-15', totalRentals: 7 },
  { id: 'b022', title: 'Becoming', author: 'Michelle Obama', genre: 'Memoir', pages: 448, amazonPrice: 500, coverGradient: 'cover-purple', coverImage: 'https://covers.openlibrary.org/b/isbn/9781524763138-M.jpg', description: 'Michelle Obama\'s memoir', popularity: 4, expectedAnnualRentals: 12, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-03-05', totalRentals: 3 },

  // Sci-fi / Thriller
  { id: 'b023', title: 'Project Hail Mary', author: 'Andy Weir', genre: 'Sci-fi', pages: 480, amazonPrice: 500, coverGradient: 'cover-blue', coverImage: 'https://covers.openlibrary.org/b/isbn/9780593135204-M.jpg', description: 'A lone astronaut on a mission to save Earth', popularity: 4, expectedAnnualRentals: 14, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-03-15', totalRentals: 2 },
  { id: 'b024', title: 'Dune', author: 'Frank Herbert', genre: 'Sci-fi', pages: 688, amazonPrice: 500, coverGradient: 'cover-orange-dark', coverImage: 'https://covers.openlibrary.org/b/isbn/9780441172719-M.jpg', description: 'Epic space opera on the desert planet of Arrakis', popularity: 4, expectedAnnualRentals: 12, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-03-10', totalRentals: 4 },
  { id: 'b025', title: 'Gone Girl', author: 'Gillian Flynn', genre: 'Thriller', pages: 432, amazonPrice: 350, coverGradient: 'cover-ink', coverImage: 'https://covers.openlibrary.org/b/isbn/9780307588371-M.jpg', description: 'A psychological thriller about a missing wife', popularity: 4, expectedAnnualRentals: 12, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-02-20', totalRentals: 5 },
  { id: 'b026', title: 'The Silent Patient', author: 'Alex Michaelides', genre: 'Thriller', pages: 336, amazonPrice: 350, coverGradient: 'cover-purple', coverImage: 'https://covers.openlibrary.org/b/isbn/9781250301697-M.jpg', description: 'A shocking psychological thriller', popularity: 4, expectedAnnualRentals: 14, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-02-28', totalRentals: 4 },

  // Kids / Young Adult
  { id: 'b027', title: 'Wonder', author: 'RJ Palacio', genre: 'YA', pages: 320, amazonPrice: 350, coverGradient: 'cover-blue', coverImage: 'https://covers.openlibrary.org/b/isbn/9780375869020-M.jpg', description: 'About a boy with a facial difference starting school', popularity: 5, expectedAnnualRentals: 20, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-02-10', totalRentals: 6 },
  { id: 'b028', title: 'Charlie and the Chocolate Factory', author: 'Roald Dahl', genre: 'Kids', pages: 176, amazonPrice: 250, coverGradient: 'cover-orange', coverImage: 'https://covers.openlibrary.org/b/isbn/9780142410318-M.jpg', description: 'A classic kids\' story of magic and chocolate', popularity: 5, expectedAnnualRentals: 22, status: 'available', condition: 'worn', currentBorrower: null, dateAcquired: '2026-01-12', totalRentals: 11 },
  { id: 'b029', title: 'Percy Jackson: The Lightning Thief', author: 'Rick Riordan', genre: 'YA', pages: 384, amazonPrice: 350, coverGradient: 'cover-blue', coverImage: 'https://covers.openlibrary.org/b/isbn/9780786838653-M.jpg', description: 'Greek mythology meets modern teen adventure', popularity: 5, expectedAnnualRentals: 20, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-02-08', totalRentals: 7 },
  { id: 'b030', title: 'The Little Prince', author: 'Antoine de Saint-Exupéry', genre: 'All-ages', pages: 96, amazonPrice: 200, coverGradient: 'cover-gold', coverImage: 'https://covers.openlibrary.org/b/isbn/9780156012195-M.jpg', description: 'A timeless tale of friendship and wonder', popularity: 5, expectedAnnualRentals: 18, status: 'available', condition: 'good', currentBorrower: null, dateAcquired: '2026-01-25', totalRentals: 8 }
];

/**
 * Calculate per-book unit economics.
 */
function bookEconomics(book) {
  const annualRevenue = book.expectedAnnualRentals * ECON.revenuePerRentalINR;
  const year1Profit = annualRevenue - book.amazonPrice;
  const year1ROI = Math.round((annualRevenue / book.amazonPrice) * 100);
  const paybackMonths = annualRevenue > 0 ? Math.round((book.amazonPrice / annualRevenue) * 12) : null;
  const lifetimeRevenue = annualRevenue * ECON.bookLifespanYears;
  const lifetimeProfit = lifetimeRevenue - book.amazonPrice;
  return { annualRevenue, year1Profit, year1ROI, paybackMonths, lifetimeRevenue, lifetimeProfit };
}

/**
 * Aggregate inventory metrics across the whole catalogue.
 */
function catalogueMetrics(books = CATALOGUE) {
  let totalInventoryCost = 0;
  let totalAnnualRevenue = 0;
  let availableCount = 0;
  let checkedOutCount = 0;
  let damagedCount = 0;
  for (const b of books) {
    totalInventoryCost += b.amazonPrice;
    totalAnnualRevenue += bookEconomics(b).annualRevenue;
    if (b.status === 'available') availableCount++;
    else if (b.status === 'checked-out') checkedOutCount++;
    else if (b.status === 'damaged') damagedCount++;
  }
  return {
    totalBooks: books.length,
    totalInventoryCost,
    totalAnnualRevenue,
    annualROI: Math.round((totalAnnualRevenue / totalInventoryCost) * 100),
    availableCount,
    checkedOutCount,
    damagedCount,
    utilization: Math.round((checkedOutCount / books.length) * 100)
  };
}

// Expose globally for non-module usage
if (typeof window !== 'undefined') {
  window.CATALOGUE = CATALOGUE;
  window.ECON = ECON;
  window.bookEconomics = bookEconomics;
  window.catalogueMetrics = catalogueMetrics;
}
