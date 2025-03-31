# Just the Facts Deployment Guide

## Deployment Architecture

Just the Facts uses a serverless architecture deployed on Vercel:

- **Frontend**: React application built with Vite
- **Backend**: Vercel Serverless Functions (in the `/api` directory)
- **Database**: None (stateless application)

## Deployment Process

### Prerequisites

- A GitHub account
- A Vercel account
- OpenAI API key
- Serper API key

### Step-by-Step Deployment

1. **Push Code to GitHub**:
   - Ensure your repository has the latest code
   - The project structure should follow the guidelines in the README

2. **Create a New Project on Vercel**:
   - Go to [Vercel](https://vercel.com) and sign in
   - Create a new project and import your GitHub repository
   - Configure the following settings:
     - Framework Preset: Vite
     - Root Directory: client
     - Build Command: npm run build
     - Output Directory: dist

3. **Configure Environment Variables**:
   - Add the following environment variables in Vercel:
     - `OPENAI_API_KEY`: Your OpenAI API key
     - `SERPER_API_KEY`: Your Serper API key

4. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy your application
   - After deployment, your app will be available at a Vercel-provided URL

### Continuous Deployment

Vercel automatically sets up continuous deployment:

- Any push to the `main` branch will trigger a new deployment
- Each deployment creates a unique URL for preview
- Successful deployments are automatically promoted to production

## Monitoring & Maintenance

- **Logs**: Access deployment and function logs in the Vercel dashboard
- **Analytics**: Use Vercel Analytics to monitor performance and usage
- **Updates**: Regularly update dependencies and API keys

## Troubleshooting

Common deployment issues:

1. **Build Failures**:
   - Check build logs in Vercel for errors
   - Ensure all dependencies are correctly installed

2. **API Errors**:
   - Verify environment variables are correctly set
   - Check function logs for API-specific errors

3. **404 Errors**:
   - Ensure your deployment settings are correct
   - Verify that the paths in your application match the Vercel configuration

## Rollback Strategy

To rollback to a previous version:

1. Go to the Vercel dashboard for your project
2. Navigate to "Deployments"
3. Find the previous working deployment
4. Click "..." and select "Promote to Production"

## Security Considerations

- Store API keys as environment variables, never in code
- Regularly rotate API keys
- Implement rate limiting to prevent abuse
- Monitor for unusual activity