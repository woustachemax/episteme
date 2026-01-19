#!/bin/bash


echo " Setting up Article Caching & Suggestions System..."

echo "Running database migrations..."
npx prisma migrate deploy

echo "Generating Prisma Client..."
npx prisma generate

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. Test by searching for an article"
echo "3. Search again to see it served from cache"
echo "4. Click 'Suggest Changes' to contribute to the community"
echo ""
echo "For more details, see CACHING_SYSTEM.md"
